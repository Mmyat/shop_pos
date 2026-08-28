package controllers

import (
	"net/http"
	"time"

	"shop_pos_backend/cache"
	"shop_pos_backend/config"
	"shop_pos_backend/models"

	"github.com/gin-gonic/gin"
)

// GetDailySales returns a continuous per-day revenue/count series for the last N days.
func GetDailySales(c *gin.Context) {
	days := parsePageParam(c.Query("days"), 7)
	if days > 90 {
		days = 90
	}

	cacheKey := "daily_sales_" + c.Query("days")
	if cached, ok := cache.Default.Get(cacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	since := time.Now().AddDate(0, 0, -days)

	var rows []struct {
		Date  string  `json:"date"`
		Total float64 `json:"total"`
		Count int64   `json:"count"`
	}

	config.DB.Model(&models.Sale{}).
		Select("DATE(created_at) as date, COALESCE(SUM(total_amount),0) as total, COUNT(*) as count").
		Where("is_deleted = ? AND created_at >= ?", false, since).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&rows)

	// Build a continuous date series (fill gaps with zero) so charts look complete
	byDate := make(map[string]struct {
		Total float64 `json:"total"`
		Count int64   `json:"count"`
	})
	for _, r := range rows {
		byDate[r.Date] = struct {
			Total float64 `json:"total"`
			Count int64   `json:"count"`
		}{Total: r.Total, Count: r.Count}
	}

	series := make([]map[string]interface{}, 0, days)
	for i := days; i >= 0; i-- {
		d := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		v := byDate[d]
		series = append(series, map[string]interface{}{
			"date":  d,
			"total": v.Total,
			"count": v.Count,
		})
	}

	cache.Default.Set(cacheKey, series, 30*time.Second)
	c.JSON(http.StatusOK, series)
}
