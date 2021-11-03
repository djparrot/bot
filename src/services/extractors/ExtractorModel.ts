import { ExtractorModelData } from '../../interfaces';

class ExtractorModel {
    name: string;
    private _raw: any;

    constructor(extractorName: string, data: any) {
        this.name = extractorName;

        Object.defineProperty(this, '_raw', {
            value: data,
            configurable: false,
            writable: false,
            enumerable: false
        });
    }

    async handle(query: string): Promise<ExtractorModelData> {
        const data = await this._raw.getInfo(query);
        if (!data) return null;

        return {
            playlist: data.playlist ?? null,
            data:
                (
                    data.info as Omit<ExtractorModelData, 'playlist'>['data']
                )?.map((m) => ({
                    title: m.title as string,
                    duration: m.duration as number,
                    thumbnail: m.thumbnail as string,
                    engine: m.engine,
                    views: m.views as number,
                    author: m.author as string,
                    description: m.description as string,
                    url: m.url as string,
                    source: m.source || 'arbitrary'
                })) ?? []
        };
    }

    validate(query: string): boolean {
        return Boolean(this._raw.validate(query));
    }

    get version(): string {
        return this._raw.version ?? '0.0.0';
    }
}

export default ExtractorModel;
