package telemetry

import (
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// PrometheusHandler returns a Gin HandlerFunc wrapping promhttp.Handler().
func PrometheusHandler() gin.HandlerFunc {
	return gin.WrapH(promhttp.Handler())
}

