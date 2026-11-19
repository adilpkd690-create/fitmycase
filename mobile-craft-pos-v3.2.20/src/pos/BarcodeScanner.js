import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "/vendor/react-jsx-runtime.js";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from '/vendor/react.js';
import { Camera, CameraOff, CheckCircle2, ImagePlus, Keyboard, ScanLine } from '/vendor/lucide-react.js';
import { Dialog } from '../components/Controls.js';
import { barcodeValue } from './barcode-match.js';
import { barcodeFormats, createBarcodeLatch, createBarcodeReader } from './barcode.js';
import { Warning } from './ui.js';

const frameDelay = 145;
const maxImageBytes = 15 * 1024 * 1024;
function stopTracks(s) { s?.getTracks().forEach(track => track.stop()); }
function reasonForCamera(error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError')
        return 'Camera access was blocked. Allow it in your browser, or open the downloaded POS file in Chrome or Edge. You can still scan a photo or use a keyboard scanner.';
    if (name === 'NotFoundError' || name === 'OverconstrainedError')
        return 'No matching camera was found. Connect a camera, choose another camera, or use a photo or keyboard scanner.';
    if (name === 'NotReadableError' || name === 'AbortError')
        return 'The camera could not start. Close other apps using it, then try again. Photo and keyboard scanning are still available.';
    return 'The camera is unavailable in this browser or preview. Try a photo, a keyboard scanner, or the downloaded POS file.';
}
function imageFromFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file), image = new Image();
        const dispose = () => URL.revokeObjectURL(url);
        image.onload = () => resolve({ image, dispose });
        image.onerror = () => { dispose(); reject(new Error('This image could not be opened. Try a PNG or JPEG photo.')); };
        image.src = url;
    });
}
function videoDevices() {
    return navigator.mediaDevices?.enumerateDevices().then(d => d.filter(i => i.kind === 'videoinput')).catch(() => []) ?? Promise.resolve([]);
}
export function BarcodeScanner({ title = 'Scan barcode', purpose, onClose, onBarcode, confirm = false, itemCount }) {
    const inputId = useId();
    const [tab, setTab] = useState('camera');
    const [phase, setPhase] = useState('off'), [devices, setDevices] = useState([]), [device, setDevice] = useState('');
    const [issue, setIssue] = useState(''), [photoBusy, setPhotoBusy] = useState(false);
    const [typed, setTyped] = useState(''), [candidate, setCandidate] = useState(null);
    const [last, setLast] = useState(null);
    const scanner = useRef(null);
    const media = useRef(null), timer = useRef(null), generation = useRef(0), imageRequest = useRef(0);
    const video = useRef(null), keyboardInput = useRef(null);
    const routeRead = useRef(onBarcode);
    useLayoutEffect(() => { routeRead.current = onBarcode; }, [onBarcode]);
    useEffect(() => { if (tab === 'keyboard')
        keyboardInput.current?.focus(); }, [tab]);
    const release = useCallback(() => {
        generation.current++;
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
        stopTracks(media.current);
        media.current = null;
        if (video.current)
            video.current.srcObject = null;
    }, []);
    useEffect(() => {
        const pause = () => {
            const hadCapture = media.current !== null;
            release();
            setPhase('off');
            if (hadCapture)
                setIssue('Camera paused while this tab was hidden. Start it again to continue.');
        };
        const onVisibility = () => { if (document.hidden)
            pause(); };
        window.addEventListener('pagehide', pause);
        document.addEventListener('visibilitychange', onVisibility);
        return () => { release(); imageRequest.current++; window.removeEventListener('pagehide', pause); document.removeEventListener('visibilitychange', onVisibility); };
    }, [release]);
    const publish = (reading) => {
        if (confirm) {
            release();
            setPhase('off');
            setCandidate(reading);
            setLast(null);
        }
        else {
            const feedback = routeRead.current(reading);
            setLast({ ...reading, ...feedback });
        }
    };
    const decode = (image, full = false) => (scanner.current ??= createBarcodeReader())(image, full);
    const startCamera = async (choice = device) => {
        release();
        imageRequest.current++;
        setPhotoBusy(false);
        setIssue('');
        setCandidate(null);
        setDevice(choice);
        if (!navigator.mediaDevices?.getUserMedia) {
            setIssue(reasonForCamera(null));
            setPhase('off');
            return;
        }
        const tag = generation.current;
        setPhase('starting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { ...(choice ? { deviceId: { exact: choice } } : { facingMode: { ideal: 'environment' } }), width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            if (generation.current !== tag || !video.current) {
                stopTracks(stream);
                return;
            }
            const currentVideo = video.current;
            media.current = stream;
            currentVideo.srcObject = stream;
            const track = stream.getVideoTracks()[0];
            track?.addEventListener('ended', () => {
                if (generation.current === tag) {
                    release();
                    setPhase('off');
                    setIssue('The camera disconnected. Reconnect it or use a keyboard scanner.');
                }
            }, { once: true });
            await currentVideo.play();
            if (generation.current !== tag)
                return;
            const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx)
                throw new Error('Canvas unavailable');
            const latch = createBarcodeLatch();
            let lastTime = -1;
            setPhase('on');
            void videoDevices().then(d => { if (generation.current === tag)
                setDevices(d); });
            const actual = track?.getSettings().deviceId;
            if (actual)
                setDevice(actual);
            const tick = () => {
                if (generation.current !== tag)
                    return;
                try {
                    const w = currentVideo.videoWidth, h = currentVideo.videoHeight;
                    if (currentVideo.readyState >= 2 && w && h && currentVideo.currentTime !== lastTime) {
                        lastTime = currentVideo.currentTime;
                        const cw = Math.floor(w * .94), ch = Math.floor(h * .66);
                        const scale = Math.min(1, 1120 / Math.max(cw, ch));
                        const dw = Math.max(1, Math.round(cw * scale)), dh = Math.max(1, Math.round(ch * scale));
                        if (canvas.width !== dw || canvas.height !== dh) {
                            canvas.width = dw;
                            canvas.height = dh;
                        }
                        ctx.drawImage(currentVideo, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, dw, dh);
                        const reading = latch(decode(ctx.getImageData(0, 0, dw, dh)), performance.now());
                        if (reading)
                            publish(reading);
                    }
                    if (generation.current === tag)
                        timer.current = window.setTimeout(tick, frameDelay);
                }
                catch {
                    if (generation.current === tag) {
                        release();
                        setPhase('off');
                        setIssue('The video frames could not be read. Try another camera or scan a photo.');
                    }
                }
            };
            tick();
        }
        catch (e) {
            if (generation.current === tag) {
                release();
                setPhase('off');
                setIssue(reasonForCamera(e));
            }
        }
    };
    const readPhoto = async (file) => {
        release();
        setPhase('off');
        setIssue('');
        setCandidate(null);
        const tag = ++imageRequest.current;
        if (file.size > maxImageBytes) {
            setIssue('Use a photo smaller than 15 MB.');
            setPhotoBusy(false);
            return;
        }
        setPhotoBusy(true);
        try {
            const { image, dispose } = await imageFromFile(file);
            try {
                if (imageRequest.current !== tag)
                    return;
                const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!image.naturalWidth || !image.naturalHeight || !ctx)
                    throw new Error('This photo could not be read.');
                const scale = Math.min(1, 1500 / Math.max(image.naturalWidth, image.naturalHeight));
                const w = Math.max(1, Math.round(image.naturalWidth * scale)), h = Math.max(1, Math.round(image.naturalHeight * scale));
                let reading = null;
                for (const rotate of [false, true]) {
                    canvas.width = rotate ? h : w;
                    canvas.height = rotate ? w : h;
                    if (rotate) {
                        ctx.translate(h, 0);
                        ctx.rotate(Math.PI / 2);
                    }
                    ctx.drawImage(image, 0, 0, w, h);
                    reading = decode(ctx.getImageData(0, 0, canvas.width, canvas.height), true);
                    if (reading)
                        break;
                }
                if (reading)
                    publish(reading);
                else
                    setIssue('No supported barcode found. Try a sharp, well-lit photo with a single barcode and space on both sides.');
            }
            finally {
                dispose();
            }
        }
        catch (e) {
            if (imageRequest.current === tag)
                setIssue(e instanceof Error ? e.message : 'The image could not be read.');
        }
        finally {
            if (imageRequest.current === tag)
                setPhotoBusy(false);
        }
    };
    const chooseTab = (next) => {
        if (next === tab)
            return;
        release();
        imageRequest.current++;
        setPhotoBusy(false);
        setPhase('off');
        setIssue('');
        setCandidate(null);
        setTab(next);
    };
    const readCode = () => {
        const value = barcodeValue(typed);
        if (!value)
            return;
        setTyped('');
        publish({ value, format: 'Keyboard' });
        keyboardInput.current?.focus();
    };
    const close = () => { release(); imageRequest.current++; onClose(); };
    return _jsxs(Dialog, { title: title, variant: "scanner", onClose: close, children: [_jsxs("div", { className: "scan-intro", children: [_jsx("p", { children: purpose }), itemCount !== undefined && _jsxs("span", { className: "scan-count", children: [itemCount, " in cart"] })] }), _jsxs("div", { className: "scan-tabs", role: "group", "aria-label": "Scan method", children: [_jsxs("button", { type: "button", "aria-pressed": tab === 'camera', onClick: () => chooseTab('camera'), children: [_jsx(Camera, { size: 16 }), " Camera"] }), _jsxs("button", { type: "button", "aria-pressed": tab === 'keyboard', onClick: () => chooseTab('keyboard'), children: [_jsx(Keyboard, { size: 17 }), " USB / Bluetooth"] })] }), tab === 'camera' ? _jsxs(_Fragment, { children: [_jsxs("div", { className: `scan-viewfinder ${phase === 'on' ? 'scan-active' : ''}`, children: [_jsx("video", { "aria-label": "Barcode camera preview", ref: video, muted: true, playsInline: true, autoPlay: true }), phase === 'on' ? _jsxs(_Fragment, { children: [_jsxs("span", { className: "scan-live", children: [_jsx("i", {}), "Camera on"] }), _jsxs("div", { className: "scan-guide", "aria-hidden": "true", children: [_jsx("i", {}), _jsx("i", {}), _jsx("i", {}), _jsx("i", {}), _jsx("b", {})] }), _jsx("small", { className: "scan-frame-tip", children: "Hold one barcode inside the frame" })] }) : _jsxs("div", { className: "scan-camera-off", children: [_jsx("span", { children: _jsx(ScanLine, { size: 29 }) }), _jsx("strong", { children: phase === 'starting' ? 'Connecting to camera…' : 'Camera is off' }), _jsx("p", { children: phase === 'starting' ? 'Check for a camera permission prompt.' : 'Use the webcam or phone camera to read a barcode.' }), phase === 'off' && _jsxs("button", { type: "button", className: "button primary-button", disabled: photoBusy, onClick: () => void startCamera(), children: [_jsx(Camera, { size: 17 }), "Start camera"] })] })] }), _jsxs("div", { className: "scan-camera-tools", children: [phase !== 'off' && _jsxs("button", { type: "button", className: "button", onClick: () => { release(); setPhase('off'); }, children: [_jsx(CameraOff, { size: 15 }), phase === 'starting' ? 'Cancel camera' : 'Stop camera'] }), devices.length > 1 && phase === 'on' && _jsxs("label", { className: "scan-device", children: [_jsx("span", { className: "sr-only", children: "Choose camera" }), _jsxs("select", { value: device, onChange: e => void startCamera(e.target.value), children: [_jsx("option", { value: "", children: "Default camera" }), devices.map((d, i) => _jsx("option", { value: d.deviceId, children: d.label || `Camera ${i + 1}` }, d.deviceId))] })] }), _jsxs("label", { className: `button scan-upload ${photoBusy ? 'scan-upload-busy' : ''}`, children: [_jsx(ImagePlus, { size: 16 }), photoBusy ? 'Reading photo…' : 'Scan photo', _jsx("input", { type: "file", accept: "image/*", "aria-label": "Scan barcode photo", disabled: photoBusy, onChange: e => { const photo = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (photo)
                                            void readPhoto(photo); } })] })] }), issue && _jsx(Warning, { tone: "error", children: issue }), phase === 'on' && !confirm && _jsx("p", { className: "scan-tip", children: "Move each label out of view before scanning the same barcode again." })] }) : _jsxs("div", { className: "scan-keyboard", children: [_jsx("p", { children: "Pair a scanner in keyboard (HID) mode, focus the field below, and scan. Use Enter if the device doesn\u2019t send it automatically." }), _jsxs("div", { className: "scan-code-form", children: [_jsx("label", { className: "sr-only", htmlFor: inputId, children: "Barcode code" }), _jsx("input", { id: inputId, ref: keyboardInput, autoComplete: "off", spellCheck: false, value: typed, onChange: e => setTyped(e.target.value), placeholder: "Scan or type the full barcode", maxLength: 96, onKeyDown: e => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                        e.preventDefault();
                                        if (!e.repeat)
                                            readCode();
                                    }
                                } }), _jsx("button", { type: "button", className: "button primary-button", disabled: !typed.trim(), onClick: readCode, children: "Read code" })] })] }), candidate && _jsxs("div", { className: "scan-feedback scan-feedback-success", children: [_jsx(CheckCircle2, { size: 20 }), _jsxs("div", { role: "status", children: [_jsx("strong", { children: "Barcode detected" }), _jsx("code", { children: candidate.value }), _jsx("small", { children: candidate.format })] }), _jsx("button", { type: "button", className: "button primary-button", onClick: () => { const next = routeRead.current(candidate); setLast({ ...candidate, ...next }); setCandidate(null); }, children: "Use barcode" })] }), last && _jsxs("div", { className: `scan-feedback scan-feedback-${last.tone}`, role: "status", children: [_jsx("span", { children: last.tone === 'success' ? _jsx(CheckCircle2, { size: 20 }) : _jsx(ScanLine, { size: 20 }) }), _jsxs("div", { children: [_jsx("strong", { children: last.title }), _jsx("code", { children: last.value }), last.detail && _jsx("small", { children: last.detail })] })] }), _jsxs("div", { className: "scan-footer", children: [_jsx("small", { children: tab === 'camera' ? `${barcodeFormats}. Frames are processed on this device.` : 'Only scans with this field focused are read.' }), _jsx("button", { className: "button", type: "button", onClick: close, children: "Done" })] })] });
}
