/**
 * NowClipboard ESM Entry Point
 * Re-exports all static methods as named exports for `import { copy, read } from 'nowclipboard'`
 */
import NowClipboard from './NowClipboard.js';

export default NowClipboard;
export var copy = NowClipboard.copy;
export var cut = NowClipboard.cut;
export var read = NowClipboard.read;
export var readRich = NowClipboard.readRich;
export var copyImage = NowClipboard.copyImage;
export var copyBlob = NowClipboard.copyBlob;
export var copyRich = NowClipboard.copyRich;
export var write = NowClipboard.write;
export var writeImage = NowClipboard.writeImage;
export var writeFormats = NowClipboard.writeFormats;
export var onPaste = NowClipboard.onPaste;
export var onChange = NowClipboard.onChange;
export var onSync = NowClipboard.onSync;
export var queryPermission = NowClipboard.queryPermission;
export var checkSupport = NowClipboard.checkSupport;
export var History = NowClipboard.History;
