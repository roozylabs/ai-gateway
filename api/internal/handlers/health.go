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
	Database string `json:"database"`
	Redis    string `json:"redis"`
}

func (h *HealthHandler) Check(c *gin.Context) {
	resp := HealthResponse{Status: "ok"}

	// Check database
	if err := h.db.PingContext(c.Request.Context()); err != nil {
		resp.Database = "error"
		resp.Status = "degraded"
	} else {
		resp.Database = "ok"
	}

	// Check Redis
	if err := h.rdb.Ping(c.Request.Context()).Err(); err != nil {
		resp.Redis = "error"
		resp.Status = "degraded"
	} else {
		resp.Redis = "ok"
	}

	status := http.StatusOK
	if resp.Status != "ok" {
		status = http.StatusServiceUnavailable
	}

	c.JSON(status, resp)
}
