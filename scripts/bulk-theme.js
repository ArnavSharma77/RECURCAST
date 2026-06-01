const fs = require("fs");
const path = require("path");

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f)) {
      let c = fs.readFileSync(p, "utf8");
      const o = c;
      c = c.replace(/indigo-600/g, "blue-700");
      c = c.replace(/indigo-500/g, "blue-600");
      c = c.replace(/indigo-400/g, "blue-500");
      c = c.replace(/indigo-300/g, "blue-400");
      c = c.replace(/indigo-200/g, "blue-300");
      c = c.replace(/violet-600/g, "blue-700");
      c = c.replace(/violet-500/g, "blue-600");
      c = c.replace(/purple-400/g, "blue-500");
      c = c.replace(/rgba\(99,102,241/g, "rgba(29,78,216");
      c = c.replace(/#6366f1/g, "#1d4ed8");
      c = c.replace(/#818cf8/g, "#3b82f6");
      c = c.replace(/#8b5cf6/g, "#2563eb");
      if (c !== o) {
        fs.writeFileSync(p, c);
        console.log("updated", p);
      }
    }
  }
}

walk("src");
console.log("done");
