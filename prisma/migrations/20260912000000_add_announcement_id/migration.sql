-- 为 job 表新增 announcement_id 列，作为 paperball-edu 公告的稳定唯一键，
-- 用于爬虫按公告 upsert（新增/更新分离），彻底消除重复行。
-- Postgres 唯一索引允许多个 NULL，故历史数据（announcement_id 为 NULL）不受影响。

-- AlterTable
ALTER TABLE "job" ADD COLUMN "announcement_id" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "job_announcement_id_key" ON "job"("announcement_id");
