package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type HealthHandler struct {
	db  *sqlx.DB
	rdb *redis.Client
}

func NewHealthHandler(db *sqlx.DB, rdb *redis.Client) *HealthHandler {
	return &HealthHandler{db: db, rdb: rdb}
}

type HealthResponse struct {
	Status   string `json:"status"`
	Version  string `json:"version"`
	Database string `json:"database"`
	Redis    string `json:"redis"`
}

// Check is the Liveness probe (/health) - returns HTTP 200 OK as long as the server is responsive.
func (h *HealthHandler) Check(c *gin.Context) {
	resp := HealthResponse{
		Status:  "ok",
		Version: "0.3.0",
	}

	if h.db != nil && h.db.PingContext(c.Request.Context()) == nil {
		resp.Database = "ok"
	} else {
		resp.Database = "degraded"
	}

	if h.rdb != nil && h.rdb.Ping(c.Request.Context()).Err() == nil {
		resp.Redis = "ok"
	} else {
		resp.Redis = "degraded"
	}

	c.JSON(http.StatusOK, resp)
}

// Ready is the Readiness probe (/ready) - returns HTTP 200 OK when DB and Redis are connected, or HTTP 503 if degraded.
func (h *HealthHandler) Ready(c *gin.Context) {
	resp := HealthResponse{
		Status:  "ok",
		Version: "0.3.0",
	}

	dbOK := true
	if h.db == nil || h.db.PingContext(c.Request.Context()) != nil {
		resp.Database = "error"
		dbOK = false
	} else {
		resp.Database = "ok"
	}

	redisOK := true
	if h.rdb == nil || h.rdb.Ping(c.Request.Context()).Err() != nil {
		resp.Redis = "error"
		redisOK = false
	} else {
		resp.Redis = "ok"
	}

	status := http.StatusOK
	if !dbOK || !redisOK {
		resp.Status = "degraded"
		status = http.StatusServiceUnavailable
	}

	c.JSON(status, resp)
}
