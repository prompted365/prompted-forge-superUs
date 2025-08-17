import { MemorySystemFactory, createDefaultMemoryConfig } from './factory';

(async () => {
  const mem = new MemorySystemFactory(createDefaultMemoryConfig());
  const { working, episodic, semantic, shared } = await mem.createAll();
  const ok = await Promise.all([working.isHealthy(), episodic.isHealthy(), semantic.isHealthy(), shared.isHealthy()]);
  console.log('health:', ok.every(Boolean));
  process.exit( ok.every(Boolean) ? 0 : 1 );
})();
