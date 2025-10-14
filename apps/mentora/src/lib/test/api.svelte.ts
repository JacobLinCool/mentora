interface Content {
    message: string;
}

interface UninitializedData<T> {
    initialized: false;
    promise: Promise<T>;
    resolve: (data: T) => void;
    initPromise: Promise<boolean>;
    data: T | undefined;
}

interface InitializedData<T> {
    initialized: true;
    data: T;
}

type Data<T> = UninitializedData<T> | InitializedData<T>;

function makeUninitializedData<T>(): Data<T> {
    let resolveFn: (data: T) => void;
    const promise = new Promise<T>((resolve) => {
        resolveFn = resolve;
    });

    return {
        initialized: false,
        promise,
        resolve: resolveFn!,
        initPromise: Promise.resolve(false),
        data: undefined,
    };
}

function initData<T>(data: Data<T>, value: T): Data<T> {
    if (data.initialized) {
        return data;
    }

    const resolve = data.resolve;
    Object.assign(data, {
        data: value,
        initialized: true,
    });
    resolve(value);
    return data;
}

export class TestAPI {
    #data = $state(makeUninitializedData<Content | null>());

    get data() {
        this.#ensureData();
        return this.#data;
    }

    async #ensureData() {
        if (this.#data.initialized) {
            return;
        }
        if (await this.#data.initPromise) {
            return;
        }
        this.#data.initPromise = (async () => {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            let i = 0;
            setInterval(() => {
                i++;
                this.#data.data = { message: `Updated ${i}` };
            }, 1000);
            const content: Content = { message: "Hello from TestAPI!" };
            initData(this.#data, content);
            return true;
        })();
        await this.#data.initPromise;
    }
}

export const api = new TestAPI();
