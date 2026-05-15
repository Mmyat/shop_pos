package controllers

import (
	"net/http"
	"time"

	"shop_pos_backend/config"
	"shop_pos_backend/models"

	"github.com/gin-gonic/gin"
)

type DashboardStats struct {
	TotalSales    int64   `json:"total_sales"`
	TotalProducts int64   `json:"total_products"`
	TotalRevenue  float64 `json:"total_revenue"`
	TodayRevenue  float64 `json:"today_revenue"`
}

func GetDashboard(c *gin.Context) {
	var stats DashboardStats

	// Total sales count
	config.DB.Model(&models.Sale{}).Count(&stats.TotalSales)

	// Total products count
	config.DB.Model(&models.Product{}).Count(&stats.TotalProducts)

	// Total revenue (all time)
	config.DB.Model(&models.Sale{}).Select("COALESCE(SUM(total_amount), 0)").Scan(&stats.TotalRevenue)

	// Today's revenue
	today := time.Now().Format("2006-01-02")
	config.DB.Model(&models.Sale{}).
		Where("DATE(created_at) = ?", today).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&stats.TodayRevenue)

	// Recent 5 sales
	var recentSales []models.Sale
	config.DB.Preload("User").Preload("Items").
		Order("created_at DESC").Limit(5).
		Find(&recentSales)

	// Low stock products: stock <= threshold (COALESCE handles NULL or unset thresholds)
	var lowStockProducts []models.Product
	config.DB.Preload("Category").
		Where("stock_quantity <= COALESCE(NULLIF(low_stock_threshold, 0), 5)").
		Order("stock_quantity ASC").
		Find(&lowStockProducts)

	c.JSON(http.StatusOK, gin.H{
		"stats":              stats,
		"recent_sales":       recentSales,
		"low_stock_products": lowStockProducts,
	})
}
