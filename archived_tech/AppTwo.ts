const oldApp = `
import React, { useEffect, useRef, useState } from 'react';
import './App.css';

interface Keyframe {
  time: number;
  value: any;
}

interface Layer {
  name: string;
  type: string;
  shapeType?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity: number;
  position: number[];
  anchorPoint: number[];
  rotation: number;
  scale: number[];
  keyframes: {
    property: string;
    frames: Keyframe[];
  }[];
}

interface AnimationData {
  version: string;
  frameRate: number;
  width: number;
  height: number;
  layers: Layer[];
}

interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  ballRadius: number;
  playerSpeed: number;
  ballSpeed: number;
}

const gameConfig: GameConfig = {
  canvasWidth: 400,
  canvasHeight: 300,
  paddleWidth: 10,
  paddleHeight: 60,
  ballRadius: 10,
  playerSpeed: 4,
  ballSpeed: 3,
};

enum GameState {
  Idle,
  Playing,
  Paused,
  GameOver,
}

class PongGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private state: GameState;
  private ballPosition: { x: number; y: number };
  private ballVelocity: { x: number; y: number };
  private paddle1Position: number;
  private paddle2Position: number;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.state = GameState.Playing;
    this.ballPosition = { x: config.canvasWidth / 2, y: config.canvasHeight / 2 };
    this.ballVelocity = { x: config.ballSpeed, y: config.ballSpeed };
    this.paddle1Position = (config.canvasHeight - config.paddleHeight) / 2;
    this.paddle2Position = (config.canvasHeight - config.paddleHeight) / 2;
    this.initEventListeners();
  }

  private initEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp':
        this.paddle1Position = Math.max(0, this.paddle1Position - this.config.playerSpeed);
        break;
      case 'ArrowDown':
        this.paddle1Position = Math.min(
          this.config.canvasHeight - this.config.paddleHeight,
          this.paddle1Position + this.config.playerSpeed
        );
        break;
      default:
        break;
    }
  }

  private handleMouseMove(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    this.paddle2Position = Math.min(
      this.config.canvasHeight - this.config.paddleHeight,
      Math.max(0, mouseY - this.config.paddleHeight / 2)
    );
  }

  private updateGame() {
    if (this.state !== GameState.Playing) return;

    this.ballPosition.x += this.ballVelocity.x;
    this.ballPosition.y += this.ballVelocity.y;

    if (this.ballPosition.y <= 0 || this.ballPosition.y >= this.config.canvasHeight) {
      this.ballVelocity.y *= -1;
    }

    if (this.ballPosition.x <= this.config.paddleWidth) {
      if (
        this.ballPosition.y >= this.paddle1Position &&
        this.ballPosition.y <= this.paddle1Position + this.config.paddleHeight
      ) {
        this.ballVelocity.x *= -1;
      } else {
        this.state = GameState.GameOver;
      }
    }

    if (this.ballPosition.x >= this.config.canvasWidth - this.config.paddleWidth) {
      if (
        this.ballPosition.y >= this.paddle2Position &&
        this.ballPosition.y <= this.paddle2Position + this.config.paddleHeight
      ) {
        this.ballVelocity.x *= -1;
      } else {
        this.state = GameState.GameOver;
      }
    }
  }

  private renderGame() {
    this.ctx.clearRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);

    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);

    this.ctx.fillStyle = '#00FF00';
    this.ctx.fillRect(0, this.paddle1Position, this.config.paddleWidth, this.config.paddleHeight);
    this.ctx.fillStyle = '#0000FF';
    this.ctx.fillRect(
      this.config.canvasWidth - this.config.paddleWidth,
      this.paddle2Position,
      this.config.paddleWidth,
      this.config.paddleHeight
    );

    this.ctx.beginPath();
    this.ctx.arc(this.ballPosition.x, this.ballPosition.y, this.config.ballRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FF0000';
    this.ctx.fill();
    this.ctx.closePath();
  }

  public start() {
    const gameLoop = () => {
      this.updateGame();
      this.renderGame();
      requestAnimationFrame(gameLoop);
    };

    gameLoop();
  }
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<HTMLCanvasElement>(null);

  const [animationFrames, setAnimationFrames] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const pongGame = new PongGame(canvas, gameConfig);
    pongGame.start();
  }, []);

  useEffect(() => {
    if (studioRef.current) {
      const ctx = studioRef.current.getContext('2d');
      ctx!.strokeStyle = '#000000';
      ctx!.lineWidth = 2;
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = studioRef.current!;
    const ctx = canvas.getContext('2d');
    ctx!.beginPath();
    ctx!.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = studioRef.current!;
    const ctx = canvas.getContext('2d');
    ctx!.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx!.stroke();
    setCurrentStroke(canvas.toDataURL());
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (currentStroke) {
      setAnimationFrames([...animationFrames, currentStroke]);
    }
  };

  const saveFrame = () => {
    if (currentStroke) {
      setAnimationFrames([...animationFrames, currentStroke]);
    }
  };

  const renderPreview = () => {
    if (studioRef.current) {
      const ctx = studioRef.current.getContext('2d');
      ctx!.clearRect(0, 0, studioRef.current.width, studioRef.current.height);

      animationFrames.forEach((frame, index) => {
        const img = new Image();
        img.src = frame;
        img.onload = () => {
          ctx!.drawImage(img, 0, 0);
        };
      });
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '50%' }}>
        <canvas ref={canvasRef} width={gameConfig.canvasWidth} height={gameConfig.canvasHeight} />
      </div>
      <div style={{ width: '50%', padding: '10px' }}>
        <canvas
          ref={studioRef}
          width={400}
          height={300}
          style={{ border: '1px solid black', marginBottom: '10px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        <button onClick={saveFrame}>Save Frame</button>
        <button onClick={renderPreview}>Preview Animation</button>
      </div>
    </div>
  );
};

export default App;
*/
`