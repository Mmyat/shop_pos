package models

import (
	"time"
)

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"uniqueIndex:idx_user_username_active,where:is_deleted = false;not null" json:"username"`
	Password  string    `gorm:"not null" json:"-"`
	Role      string    `gorm:"default:'cashier'" json:"role"` // admin, cashier
	IsDeleted bool      `gorm:"default:false;not null;index" json:"is_deleted"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Category struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"uniqueIndex:idx_category_name_active,where:is_deleted = false;not null" json:"name"`
	Description string    `json:"description"`
	IsDeleted   bool      `gorm:"default:false;not null;index" json:"is_deleted"`
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
	Barcode           string    `gorm:"uniqueIndex:idx_barcode_active,where:is_deleted = false" json:"barcode"`
	IsDeleted         bool      `gorm:"default:false;not null;index" json:"is_deleted"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Sale struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	TotalAmount float64    `gorm:"not null" json:"total_amount"`
	UserID      uint       `json:"user_id"`
	User        User       `gorm:"foreignKey:UserID" json:"user"`
	CustomerID  *uint      `json:"customer_id"`
	Customer    Customer   `gorm:"foreignKey:CustomerID" json:"customer"`
	IsDeleted   bool       `gorm:"default:false;not null;index" json:"is_deleted"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Items       []SaleItem `gorm:"foreignKey:SaleID;constraint:OnDelete:CASCADE" json:"items"`
}

type Customer struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	Phone     string    `gorm:"uniqueIndex:idx_customer_phone_active,where:is_deleted = false" json:"phone"`
	Email     string    `json:"email"`
	Points    int       `gorm:"default:0" json:"points"`
	IsDeleted bool      `gorm:"default:false;not null;index" json:"is_deleted"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SaleItem struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	SaleID    uint      `gorm:"not null" json:"sale_id"`
	ProductID uint      `gorm:"not null" json:"product_id"`
	Product   Product   `gorm:"foreignKey:ProductID" json:"product"`
	Quantity  int       `gorm:"not null" json:"quantity"`
	Price     float64   `gorm:"not null" json:"price"`
	IsDeleted bool      `gorm:"default:false;not null;index" json:"is_deleted"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
