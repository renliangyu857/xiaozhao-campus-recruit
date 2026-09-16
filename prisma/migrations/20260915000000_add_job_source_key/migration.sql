-- 为飞书岗位同步保存来源记录 ID，作为跨日增量同步的稳定去重键。
ALTER TABLE job ADD COLUMN source_key VARCHAR(128);
CREATE UNIQUE INDEX job_source_key_key ON job(source_key);
