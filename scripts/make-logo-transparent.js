const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const src = path.join(__dirname, '../public/assets/logo.png');
const dst = path.join(__dirname, '../public/assets/logo-transparent.png');

fs.createReadStream(src)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function () {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (this.width * y + x) * 4;
        const r = this.data[i];
        const g = this.data[i + 1];
        const b = this.data[i + 2];

        // Gray background: r≈g≈b and mid-range (100–200)
        // White text: r,g,b all > 220
        const isGray = Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && Math.abs(r - b) < 18;
        const brightness = (r + g + b) / 3;

        if (isGray && brightness < 210) {
          // Background pixel → transparent
          this.data[i + 3] = 0;
        } else if (isGray && brightness >= 210) {
          // White/near-white text → keep, tint gold (#D4AF37)
          const t = (brightness - 210) / 45; // 0..1
          this.data[i]     = Math.round(r * t + 212 * (1 - t)); // toward gold R
          this.data[i + 1] = Math.round(g * t + 175 * (1 - t)); // toward gold G
          this.data[i + 2] = Math.round(b * t + 55  * (1 - t)); // toward gold B
          this.data[i + 3] = 255;
        }
      }
    }
    this.pack()
      .pipe(fs.createWriteStream(dst))
      .on('finish', () => console.log('Done → ' + dst));
  });
