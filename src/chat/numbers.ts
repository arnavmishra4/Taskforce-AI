// A whole figure in the written words: "$2.90M", "41.9%", "$68,234", "1,050 mm", "34 days". A standalone number
// only, never the digits of a code or name (CR42, DRAFT-147), and never part of one ("2" of "2.90X" is not matched).
const FIGURE = /((?<![\w$-])\$?\d[\d,]*(?:\.\d+)?(?:%|[KMB]\b|\s(?:mm|cm|km|m|kg|days?|hours?|hrs?|weeks?|months?)\b)?(?![\w%-]|[.,]\d))/;

// text split into [plain, figure, plain, figure, ...]: the odd parts are the figures
export const splitFigures = (text: string) => text.split(FIGURE);
