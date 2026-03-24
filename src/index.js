'use strict';
const fs = require('fs');
const path = require('path');

// Polling-based file watcher — emit events when files change

class FileWatcher {
  constructor(options) {
    options = options || {};
    this.interval = options.interval || 500;
    this._watched = new Map();
    this._handlers = [];
    this._timer = null;
  }

  watch(filePath) {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) throw new Error('File not found: ' + abs);
    const stat = fs.statSync(abs);
    this._watched.set(abs, { mtime: stat.mtimeMs, size: stat.size });
    return this;
  }

  on(fn) {
    if (typeof fn !== 'function') throw new TypeError('Handler must be a function');
    this._handlers.push(fn);
    return this;
  }

  start() {
    if (this._timer) return this;
    this._timer = setInterval(() => this._poll(), this.interval);
    return this;
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    return this;
  }

  _poll() {
    this._watched.forEach((prev, filePath) => {
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs !== prev.mtime || stat.size !== prev.size) {
          this._watched.set(filePath, { mtime: stat.mtimeMs, size: stat.size });
          this._emit({ event: 'change', path: filePath, mtime: stat.mtimeMs });
        }
      } catch (_) {
        this._emit({ event: 'unlink', path: filePath });
        this._watched.delete(filePath);
      }
    });
  }

  _emit(event) {
    this._handlers.forEach((h) => h(event));
  }

  unwatch(filePath) {
    return this._watched.delete(path.resolve(filePath));
  }
}

module.exports = FileWatcher;
