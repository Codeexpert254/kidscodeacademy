-- Create database
CREATE DATABASE IF NOT EXISTS kids_coding;

-- Use database
USE kids_coding;

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  path VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_name VARCHAR(255) NOT NULL,
  child_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  session_type VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table (for future expansion)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('parent', 'tutor', 'admin') DEFAULT 'parent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);