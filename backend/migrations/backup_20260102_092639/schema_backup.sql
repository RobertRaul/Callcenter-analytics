-- MySQL dump 10.13  Distrib 8.0.42, for Linux (x86_64)
--
-- Host: 192.168.3.2    Database: asteriskcdrdb
-- ------------------------------------------------------
-- Server version	5.5.64-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cdr`
--

DROP TABLE IF EXISTS `cdr`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cdr` (
  `calldate` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `clid` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `src` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `dst` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `dcontext` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `channel` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `dstchannel` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `lastapp` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `lastdata` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `duration` int(11) NOT NULL DEFAULT '0',
  `billsec` int(11) NOT NULL DEFAULT '0',
  `disposition` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `amaflags` int(11) NOT NULL DEFAULT '0',
  `accountcode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `uniqueid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `userfield` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `recordingfile` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `cnum` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `cnam` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `outbound_cnum` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `outbound_cnam` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `dst_cnam` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `did` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  KEY `IDX_UNIQUEID` (`uniqueid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cel`
--

DROP TABLE IF EXISTS `cel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventtype` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventtime` datetime NOT NULL,
  `cid_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cid_num` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cid_ani` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cid_rdnis` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cid_dnid` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `exten` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `context` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channame` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `appname` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `appdata` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amaflags` int(11) NOT NULL,
  `accountcode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uniqueid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `linkedid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `peer` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userdeftype` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventextra` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userfield` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `uniqueid_index` (`uniqueid`),
  KEY `linkedid_index` (`linkedid`)
) ENGINE=InnoDB AUTO_INCREMENT=8220645 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `queue_log`
--

DROP TABLE IF EXISTS `queue_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `queue_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `time` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `callid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `queuename` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data5` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `time_idx` (`time`),
  KEY `callid_idx` (`callid`),
  KEY `queuename_idx` (`queuename`),
  KEY `agent_idx` (`agent`),
  KEY `event_idx` (`event`),
  KEY `created_idx` (`created_at`),
  KEY `idx_time_event` (`time`,`event`),
  KEY `idx_time_queuename` (`time`,`queuename`),
  KEY `idx_time_agent` (`time`,`agent`),
  KEY `idx_time_queue_event` (`time`,`queuename`,`event`)
) ENGINE=InnoDB AUTO_INCREMENT=8520861 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `queue_log_daily_stats`
--

DROP TABLE IF EXISTS `queue_log_daily_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `queue_log_daily_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stat_date` date NOT NULL,
  `queuename` varchar(32) NOT NULL,
  `total_calls` int(11) DEFAULT '0',
  `answered_calls` int(11) DEFAULT '0',
  `abandoned_calls` int(11) DEFAULT '0',
  `total_wait_time` int(11) DEFAULT '0',
  `total_talk_time` int(11) DEFAULT '0',
  `max_wait_time` int(11) DEFAULT '0',
  `min_wait_time` int(11) DEFAULT '999999',
  `calculated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_date_queue` (`stat_date`,`queuename`),
  KEY `idx_date` (`stat_date`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-02  9:26:43
