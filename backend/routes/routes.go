package routes

import (
	"shop_pos_backend/controllers"
	"shop_pos_backend/middlewares"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")

	// Public routes
	api.POST("/register", controllers.Register)
	api.POST("/login", controllers.Login)

	// Protected routes
	protected := api.Group("/")
	protected.Use(middlewares.AuthMiddleware())
	{
		// Dashboard
		protected.GET("/dashboard", controllers.GetDashboard)
		protected.GET("/reports/daily-sales", controllers.GetDailySales)

		// Admin only routes
		admin := protected.Group("/")
		admin.Use(middlewares.AdminOnly())
		{
			// Users
			admin.GET("/users", controllers.GetUsers)
			admin.PUT("/users/:id", controllers.UpdateUser)
			admin.DELETE("/users/:id", controllers.DeleteUser)

			// Categories
			admin.POST("/categories", controllers.CreateCategory)
			admin.PUT("/categories/:id", controllers.UpdateCategory)
			admin.DELETE("/categories/:id", controllers.DeleteCategory)

			// Products (Creation and Deletion)
			admin.POST("/products", controllers.CreateProduct)
			admin.PUT("/products/:id", controllers.UpdateProduct)
			admin.DELETE("/products/:id", controllers.DeleteProduct)
			admin.PATCH("/products/:id/stock", controllers.UpdateStock)

			// Customers (Edit/Delete)
			admin.PUT("/customers/:id", controllers.UpdateCustomer)
			admin.DELETE("/customers/:id", controllers.DeleteCustomer)

			// Sales (Deletion)
			admin.DELETE("/sales/:id", controllers.DeleteSale)
		}

		// Common routes (Admin and Cashier)
		protected.GET("/categories", controllers.GetCategories)
		protected.GET("/products", controllers.GetProducts)
		protected.GET("/products/barcode/:barcode", controllers.GetProductByBarcode)
		protected.POST("/sales", controllers.CreateSale)
		protected.GET("/sales", controllers.GetSales)
		protected.GET("/sales/:id", controllers.GetSaleByID)

		// Customers (lookup & create at POS for both roles)
		protected.GET("/customers", controllers.GetCustomers)
		protected.GET("/customers/phone/:phone", controllers.GetCustomerByPhone)
		protected.POST("/customers", controllers.CreateCustomer)
	}
}
