'use client';

import React, { useEffect, useRef } from 'react';

export const GameCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let phaserGame: any = null;
    let isCancelled = false;

    const handleResize = () => {
      if (phaserGame && containerRef.current) {
        const width = containerRef.current.clientWidth || 1280;
        const height = containerRef.current.clientHeight || 460;
        phaserGame.scale.resize(width, height);
      }
    };

    import('phaser').then((Phaser) => {
      import('../../../game/chicken-road/ChickenRoadScene').then(({ ChickenRoadScene }) => {
        if (isCancelled || !containerRef.current) return;

        // Clear existing canvas nodes inside container
        containerRef.current.innerHTML = '';

        const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
        const width = containerRef.current.clientWidth || 1280;
        const height = containerRef.current.clientHeight || 460;

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: containerRef.current,
          width,
          height,
          banner: false,
          render: {
            antialias: true,
            antialiasGL: true,
            roundPixels: true,
          },
          backgroundColor: '#2a2d32',
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          scene: [ChickenRoadScene],
        };
        (config as any).resolution = pixelRatio;

        phaserGame = new Phaser.Game(config);
        gameRef.current = phaserGame;

        window.addEventListener('resize', handleResize);
      });
    });

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleResize);
      if (phaserGame) {
        phaserGame.destroy(true);
        phaserGame = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[300px] bg-[#2a2d32] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing">
      <div ref={containerRef} className="w-full h-full relative" />
    </div>
  );
};

export default GameCanvas;

