import { BarcodeFormat, BinaryBitmap, DecodeHintType, GlobalHistogramBinarizer, MultiFormatOneDReader, NotFoundException, RGBLuminanceSource } from '/vendor/zxing.js';
import { barcodeValue, retailAlias } from './barcode-match.js';
export const barcodeFormats = 'Code 128, Code 39, EAN-13, EAN-8, UPC-A and ITF';
export function lookupFeedback(kind) {
    return kind === 'ambiguous'
        ? { tone: 'warning', title: 'Barcode matches more than one product', detail: 'Correct the barcode assignments in Products & stock before using this code.' }
        : { tone: 'warning', title: 'Barcode not registered', detail: 'Add or edit the product in Products & stock and save this barcode first.' };
}
// Two matching frames confirm a reading. A visible label is latched until it has been
// absent for at least the rearm interval. Transient misses do not repeat an item.
export function createBarcodeLatch(rearmMs = 850) {
    const held = new Map();
    let previous = null, streak = 0;
    return (reading, clock) => {
        const value = reading ? barcodeValue(reading.value) : '';
        const code = value.length === 13 ? retailAlias(value) ?? value : value;
        for (const [key, missed] of held) {
            if (key === code) {
                held.set(key, null);
                continue;
            }
            const absent = missed ?? { since: clock, frames: 0 };
            absent.frames++;
            // Require observed missing frames, not just a slow CPU or a paused video.
            if (absent.frames >= 4 && clock - absent.since >= rearmMs)
                held.delete(key);
            else
                held.set(key, absent);
        }
        if (!reading || !code) {
            previous = null;
            streak = 0;
            return null;
        }
        streak = previous === code ? streak + 1 : 1;
        previous = code;
        if (held.has(code) || streak < 2)
            return null;
        held.set(code, null);
        return reading;
    };
}
const possibleFormats = [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.ITF];
const formats = new Map([
    [BarcodeFormat.CODE_128, 'Code 128'], [BarcodeFormat.CODE_39, 'Code 39'], [BarcodeFormat.EAN_13, 'EAN-13'],
    [BarcodeFormat.EAN_8, 'EAN-8'], [BarcodeFormat.UPC_A, 'UPC-A'], [BarcodeFormat.ITF, 'ITF'],
]);
export function createBarcodeReader() {
    const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, possibleFormats]]);
    const thorough = new Map(hints).set(DecodeHintType.TRY_HARDER, true);
    const reader = new MultiFormatOneDReader(hints);
    let grey = new Uint8ClampedArray(0);
    return (image, full = false) => {
        const { width, height, data } = image;
        const size = width * height;
        if (width < 48 || height < 5 || data.length !== size * 4)
            return null;
        if (grey.length !== size)
            grey = new Uint8ClampedArray(size);
        for (let px = 0, a = 0; px < size; px++, a += 4) {
            const luma = (data[a] + (data[a + 1] << 1) + data[a + 2]) >> 2;
            // Alpha-composite transparent PNG labels over white without uploading them.
            grey[px] = data[a + 3] === 255 ? luma : 255 - (((255 - luma) * data[a + 3]) / 255);
        }
        try {
            const bmp = new BinaryBitmap(new GlobalHistogramBinarizer(new RGBLuminanceSource(grey, width, height)));
            const result = reader.decode(bmp, full ? thorough : hints);
            const value = barcodeValue(result.getText());
            return value ? { value, format: formats.get(result.getBarcodeFormat()) ?? 'Barcode' } : null;
        }
        catch (e) {
            if (e instanceof NotFoundException)
                return null;
            throw e;
        }
        finally {
            reader.reset();
        }
    };
}
