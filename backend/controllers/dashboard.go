package controllers

import (
	"net/http"
	"time"

	"shop_pos_backend/cache"
	"shop_pos_backend/config"
	"shop_pos_backend/models"

	"github.com/gin-gonic/gin"
)

const dashboardCacheKey = "dashboard_stats"

type DashboardStats struct {
	TotalSales    int64   `json:"total_sales"`
	TotalProducts int64   `json:"total_products"`
	TotalRevenue  float64 `json:"total_revenue"`
	TodayRevenue  float64 `json:"today_revenue"`
}

func GetDashboard(c *gin.Context) {
	if cached, ok := cache.Default.Get(dashboardCacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	var stats DashboardStats

	// Total sales count
	config.DB.Model(&models.Sale{}).Where("is_deleted = ?", false).Count(&stats.TotalSales)

	// Total products count
	config.DB.Model(&models.Product{}).Where("is_deleted = ?", false).Count(&stats.TotalProducts)

	// Total revenue (all time)
	config.DB.Model(&models.Sale{}).Where("is_deleted = ?", false).Select("COALESCE(SUM(total_amount), 0)").Scan(&stats.TotalRevenue)

	// Today's revenue
	today := time.Now().Format("2006-01-02")
	config.DB.Model(&models.Sale{}).
		Where("is_deleted = ? AND DATE(created_at) = ?", false, today).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&stats.TodayRevenue)

	// Recent 5 sales
	var recentSales []models.Sale
	config.DB.Preload("User").Preload("Items", "is_deleted = ?", false).Preload("Items.Product").
		Where("is_deleted = ?", false).
		Order("created_at DESC").Limit(5).
		Find(&recentSales)

	// Low stock products: stock <= threshold (COALESCE handles NULL or unset thresholds)
	var lowStockProducts []models.Product
	config.DB.Preload("Category").
		Where("is_deleted = ? AND stock_quantity <= COALESCE(NULLIF(low_stock_threshold, 0), 5)", false).
		Order("stock_quantity ASC").
		Find(&lowStockProducts)

	payload := gin.H{
		"stats":              stats,
		"recent_sales":       recentSales,
		"low_stock_products": lowStockProducts,
	}

	cache.Default.Set(dashboardCacheKey, payload, 30*time.Second)
	c.JSON(http.StatusOK, payload)
}
