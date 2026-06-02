package models

import (
	"time"
)

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"unique;not null" json:"username"`
	Password  string    `gorm:"not null" json:"-"`
	Role      string    `gorm:"default:'cashier'" json:"role"` // admin, cashier
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Category struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"unique;not null" json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Product struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Name          string    `gorm:"not null" json:"name"`
	CategoryID    uint      `json:"category_id"`
	Category      Category  `gorm:"foreignKey:CategoryID" json:"category"`
	Price         float64   `gorm:"not null" json:"price"`
	StockQuantity     int       `gorm:"not null;default:0" json:"stock_quantity"`
	LowStockThreshold int       `gorm:"not null;default:5" json:"low_stock_threshold"`
	ImageURL          string    `json:"image_url"`
	Barcode           string    `gorm:"unique" json:"barcode"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Sale struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	TotalAmount float64    `gorm:"not null" json:"total_amount"`
	UserID      uint       `json:"user_id"`
	User        User       `gorm:"foreignKey:UserID" json:"user"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Items       []SaleItem `gorm:"foreignKey:SaleID;constraint:OnDelete:CASCADE" json:"items"`
}

type SaleItem struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	SaleID    uint      `gorm:"not null" json:"sale_id"`
	ProductID uint      `gorm:"not null" json:"product_id"`
	Product   Product   `gorm:"foreignKey:ProductID" json:"product"`
	Quantity  int       `gorm:"not null" json:"quantity"`
	Price     float64   `gorm:"not null" json:"price"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
