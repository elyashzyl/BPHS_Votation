export const Device = {
  _id: null,
  _gen() {
    const c = document.createElement('canvas'); c.width = 200; c.height = 50;
    const x = c.getContext('2d'); x.textBaseline = 'top'; x.font = '14px Arial';
    x.fillStyle = '#f60'; x.fillRect(0, 0, 200, 50);
    x.fillStyle = '#fff'; x.fillText('BPHS-SBO', 10, 10);
    x.fillStyle = '#000'; x.fillText((navigator.userAgent || '').slice(-20), 10, 30);
    const parts = [c.toDataURL(), screen.width + 'x' + screen.height, screen.colorDepth, navigator.language, navigator.platform, navigator.hardwareConcurrency || '1'].join('|||');
    let h = 0; for (let i = 0; i < parts.length; i++) { h = ((h << 5) - h) + parts.charCodeAt(i); h = h & h; }
    return 'dev_' + Math.abs(h).toString(36) + '_' + Date.now().toString(36);
  },
  getId() {
    if (this._id) return this._id;
    let id = localStorage.getItem('sbo_did');
    if (!id) { id = this._gen(); localStorage.setItem('sbo_did', id); }
    this._id = id; return id;
  }
};
