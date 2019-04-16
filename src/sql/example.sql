CREATE TABLE `ok_payment` (
  `uid` bigint(20) NOT NULL,
  `transaction_time` datetime NOT NULL,
  `transaction_id` bigint(20) NOT NULL,
  `product_code` varchar(255) NOT NULL,
  `product_option` varchar(255) DEFAULT NULL,
  `amount` int(11) NOT NULL,
  `currency` varchar(255) DEFAULT NULL,
  `payment_system` varchar(255) DEFAULT NULL,
  `extra_attributes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



CREATE TABLE `player` (
  `uid` bigint(20) NOT NULL,
  `balance` int(11) NOT NULL DEFAULT '0',
  `state` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`uid`),
  KEY `uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;