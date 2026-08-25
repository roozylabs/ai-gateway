package proxy

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/roozylabs/prism/internal/models"
)

const (
	idempotencyTTL     = 24 * time.Hour
	idempotencyLockTTL = 120 * time.Second
	maxEnvelopeBytes   = 5 * 1024 * 1024
)

type idempotencyEnvelope struct {
	Status      int    `json:"status"`
	ContentType string `json:"content_type"`
	Body        []byte `json:"body"`
	Truncated   bool   `json:"truncated"`
}

func EncodeEnvelope(status int, contentType string, body []byte, truncated bool) []byte {
	env := idempotencyEnvelope{Status: status, ContentType: contentType, Body: body, Truncated: truncated}
	data, _ := json.Marshal(env)
	return data
}

func DecodeEnvelope(data []byte) (int, string, []byte, bool, error) {
	var env idempotencyEnvelope
	if err := json.Unmarshal(data, &env); err != nil {
		return 0, "", nil, false, fmt.Errorf("unmarshal envelope: %w", err)
	}
	return env.Status, env.ContentType, env.Body, env.Truncated, nil
}

type IdempotencyStore struct {
	rdb *redis.Client
}

func NewIdempotencyStore(rdb *redis.Client) *IdempotencyStore {
	return &IdempotencyStore{rdb: rdb}
}

func (s *IdempotencyStore) keyHash(gatewayKeyID, clientKey string) string {
	h := sha256.Sum256([]byte(clientKey))
	return fmt.Sprintf("%s:%x", gatewayKeyID, h[:])
}

func (s *IdempotencyStore) Load(ctx context.Context, gatewayKeyID, clientKey string) (int, string, []byte, bool, bool, error) {
	data, err := s.rdb.Get(ctx, "idem:"+s.keyHash(gatewayKeyID, clientKey)).Bytes()
	if err != nil {
		if err == redis.Nil {
			return 0, "", nil, false, false, nil
		}
		return 0, "", nil, false, false, fmt.Errorf("idem load: %w", err)
	}
	status, ct, body, truncated, err := DecodeEnvelope(data)
	return status, ct, body, truncated, true, err
}

func (s *IdempotencyStore) Acquire(ctx context.Context, gatewayKeyID, clientKey string) (bool, error) {
	ok, err := s.rdb.SetNX(ctx, "idem:lock:"+s.keyHash(gatewayKeyID, clientKey), "1", idempotencyLockTTL).Result()
	if err != nil {
		return false, fmt.Errorf("idem acquire: %w", err)
	}
	return ok, nil
}

func (s *IdempotencyStore) Release(ctx context.Context, gatewayKeyID, clientKey string) {
	if err := s.rdb.Del(ctx, "idem:lock:"+s.keyHash(gatewayKeyID, clientKey)).Err(); err != nil {
		log.Printf("idem release: %v", err)
	}
}

func (s *IdempotencyStore) Save(ctx context.Context, gatewayKeyID, clientKey string, envelope []byte) error {
	if len(envelope) > maxEnvelopeBytes {
		envelope = envelope[:maxEnvelopeBytes]
	}
	return s.rdb.Set(ctx, "idem:"+s.keyHash(gatewayKeyID, clientKey), envelope, idempotencyTTL).Err()
}

type bufferingResponseWriter struct {
	gin.ResponseWriter
	buf     *bytes.Buffer
	written int
}

func (w *bufferingResponseWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	w.written += n
	if w.buf != nil && w.written <= maxEnvelopeBytes {
		w.buf.Write(b)
	}
	return n, err
}

func (w *bufferingResponseWriter) WrittenBytes() []byte {
	if w.buf == nil {
		return nil
	}
	return w.buf.Bytes()
}

func (w *bufferingResponseWriter) Truncated() bool {
	return w.written > maxEnvelopeBytes
}

func IdempotencyMiddleware(store *IdempotencyStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		idemKey := c.GetHeader("Idempotency-Key")
		if idemKey == "" {
			c.Next()
			return
		}
		gk, _ := c.MustGet("gatewayKey").(*models.GatewayAPIKey)
		if gk == nil {
			c.Next()
			return
		}
		ctx := c.Request.Context()
		if status, ct, body, truncated, found, err := store.Load(ctx, gk.ID, idemKey); err == nil && found {
			c.Header("Idempotent-Replay", "true")
			if truncated {
				c.Header("Idempotent-Truncated", "true")
			}
			c.Data(status, ct, body)
			c.Abort()
			return
		}
		acquired, err := store.Acquire(ctx, gk.ID, idemKey)
		if err != nil {
			log.Printf("idem acquire: %v", err)
			c.Next()
			return
		}
		if !acquired {
			c.JSON(http.StatusConflict, gin.H{
				"error": gin.H{
					"code":    "idempotency_conflict",
					"message": "A request with this idempotency key is already in progress",
					"type":    "invalid_request_error",
				},
			})
			c.Abort()
			return
		}
		defer store.Release(ctx, gk.ID, idemKey)
		c.Set("_idem_gk_id", gk.ID)
		c.Set("_idem_key", idemKey)
		c.Next()
	}
}

func WrapBufferedWriter(c *gin.Context) *bufferingResponseWriter {
	bw := &bufferingResponseWriter{ResponseWriter: c.Writer, buf: &bytes.Buffer{}}
	c.Writer = bw
	return bw
}

func SaveIdempotencyResult(c *gin.Context, store *IdempotencyStore) {
	gkIDRaw, _ := c.Get("_idem_gk_id")
	idemKeyRaw, _ := c.Get("_idem_key")
	if gkIDRaw == nil || idemKeyRaw == nil || store == nil {
		return
	}
	gkID, _ := gkIDRaw.(string)
	idemKey, _ := idemKeyRaw.(string)
	if gkID == "" || idemKey == "" {
		return
	}
	bw, ok := c.Writer.(*bufferingResponseWriter)
	if !ok || bw.WrittenBytes() == nil {
		return
	}
	ct := c.Writer.Header().Get("Content-Type")
	if ct == "" {
		ct = "application/json"
	}
	env := EncodeEnvelope(c.Writer.Status(), ct, bw.WrittenBytes(), bw.Truncated())
	if err := store.Save(c.Request.Context(), gkID, idemKey, env); err != nil {
		log.Printf("idem save: %v", err)
	}
}
