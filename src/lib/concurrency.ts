/**
 * A lightweight implementation of p-limit to control concurrency.
 * @param limit Max number of concurrent promises
 * @returns A function that takes a promise-returning function and arguments
 */
export function pLimit(limit: number) {
    const queue: (() => void)[] = [];
    let activeCount = 0;

    const next = () => {
        activeCount--;
        if (queue.length > 0) {
            const queueItem = queue.shift();
            queueItem?.();
        }
    };

    const run = async <T>(fn: () => Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => {
        activeCount++;
        const result = (async () => fn())();
        try {
            const value = await result;
            resolve(value);
        } catch (err) {
            reject(err);
        }
        next();
    };

    const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            const runTask = () => run(fn, resolve, reject);

            if (activeCount < limit) {
                runTask();
            } else {
                queue.push(runTask);
            }
        });
    };

    return enqueue;
}
