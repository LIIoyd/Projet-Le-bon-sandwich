-- Adminer 4.6.3 MySQL dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` varchar(128) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `withdraw` datetime NOT NULL,
  `name` varchar(128) NOT NULL,
  `email` varchar(256) NOT NULL,
  `amount_to_pay` decimal(8,2) DEFAULT NULL,
  `discount` decimal(8,2) DEFAULT NULL,
  `token` varchar(128) DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `payment_ref` varchar(128) DEFAULT NULL,
  `payment_date` datetime DEFAULT NULL,
  `payment_method` int(11) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `items`;
CREATE TABLE `items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uri` varchar(128) NOT NULL,
  `label` varchar(128) DEFAULT NULL,
  `price` decimal(8,2) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `order_id` varchar(128) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


-- 2019-11-08 13:47:44