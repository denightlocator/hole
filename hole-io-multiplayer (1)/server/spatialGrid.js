class SpatialGrid {
  constructor(cellSize = 25) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  _getKey(cx, cz) {
    return `${cx},${cz}`;
  }

  _getCellCoord(val) {
    return Math.floor(val / this.cellSize);
  }

  insert(item) {
    const cx = this._getCellCoord(item.x);
    const cz = this._getCellCoord(item.z);
    const key = this._getKey(cx, cz);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key).add(item);
    item._gridCell = key;
  }

  remove(item) {
    if (item._gridCell && this.grid.has(item._gridCell)) {
      this.grid.get(item._gridCell).delete(item);
    }
    item._gridCell = null;
  }

  update(item) {
    const cx = this._getCellCoord(item.x);
    const cz = this._getCellCoord(item.z);
    const newKey = this._getKey(cx, cz);
    if (item._gridCell !== newKey) {
      this.remove(item);
      if (!this.grid.has(newKey)) {
        this.grid.set(newKey, new Set());
      }
      this.grid.get(newKey).add(item);
      item._gridCell = newKey;
    }
  }

  queryRadius(x, z, radius) {
    const minCX = this._getCellCoord(x - radius);
    const maxCX = this._getCellCoord(x + radius);
    const minCZ = this._getCellCoord(z - radius);
    const maxCZ = this._getCellCoord(z + radius);

    const results = [];
    const radiusSq = radius * radius;

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const key = this._getKey(cx, cz);
        const cell = this.grid.get(key);
        if (cell) {
          for (const item of cell) {
            const dx = item.x - x;
            const dz = item.z - z;
            if (dx * dx + dz * dz <= radiusSq) {
              results.push(item);
            }
          }
        }
      }
    }
    return results;
  }
}

module.exports = SpatialGrid;
