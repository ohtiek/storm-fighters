// render/pixi/spritePool.js
// Generic object pool for PIXI.Sprite and PIXI.AnimatedSprite.
// Avoids creating/destroying sprites every frame — reuse them instead.

import * as PIXI from 'pixi.js';

export class SpritePool {
  constructor(createFn, resetFn) {
    this._create = createFn;
    this._reset  = resetFn;
    this._free   = [];     // available sprites
    this._active = new Set();
  }

  acquire(...args) {
    let sprite;
    if (this._free.length > 0) {
      sprite = this._free.pop();
    } else {
      sprite = this._create();
    }
    this._reset(sprite, ...args);
    this._active.add(sprite);
    return sprite;
  }

  release(sprite) {
    if (!this._active.has(sprite)) return;
    this._active.delete(sprite);
    sprite.visible = false;
    if (sprite.parent) sprite.parent.removeChild(sprite);
    this._free.push(sprite);
  }

  releaseAll() {
    this._active.forEach(s => this.release(s));
  }

  get size() { return this._active.size; }
}

// ── AnimatedSprite pool helper ─────────────────────────────────────
export function makeAnimPool(frames, layer, scale = 1, speed = 0.1) {
  return new SpritePool(
    () => {
      const anim = new PIXI.AnimatedSprite(frames);
      anim.anchor.set(0.5);
      anim.scale.set(scale);
      anim.animationSpeed = speed;
      return anim;
    },
    (anim, x, y) => {
      anim.x = x; anim.y = y;
      anim.visible = true;
      anim.currentFrame = 0;
      anim.play();
      if (!anim.parent) layer.addChild(anim);
    }
  );
}

// ── One-shot animated sprite (plays once then auto-releases) ───────
export function playOnce(frames, x, y, layer, scale = 1, speed = 0.4, onDone) {
  const anim = new PIXI.AnimatedSprite(frames);
  anim.anchor.set(0.5);
  anim.scale.set(scale);
  anim.animationSpeed = speed;
  anim.loop = false;
  anim.x = x; anim.y = y;
  anim.onComplete = () => {
    layer.removeChild(anim);
    onDone?.();
  };
  layer.addChild(anim);
  anim.play();
  return anim;
}
