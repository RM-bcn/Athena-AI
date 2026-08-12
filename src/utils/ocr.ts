import { createWorker, Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('ell', 1, { logger: () => {} });
  }
  return workerPromise;
}

export async function extractTextFromImage(image: string): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  return ((data as any)?.text || '').trim();
}
