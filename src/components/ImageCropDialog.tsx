import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { getCroppedImg, CroppedArea } from "@/lib/cropImage";
import { Loader2, ZoomIn, RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspectRatio: number;
  onCropComplete: (croppedBlob: Blob) => void;
  title?: string;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  aspectRatio,
  onCropComplete,
  title = "이미지 편집",
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedArea | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onRotationChange = useCallback((rotation: number) => {
    setRotation(rotation);
  }, []);

  const handleCropComplete = useCallback((_: any, croppedAreaPixels: CroppedArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, flipHorizontal, flipVertical);
      onCropComplete(croppedBlob);
      onOpenChange(false);
      // Reset state
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setFlipHorizontal(false);
      setFlipVertical(false);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
  };

  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFlipHorizontal = () => {
    setFlipHorizontal((prev) => !prev);
  };

  const handleFlipVertical = () => {
    setFlipVertical((prev) => !prev);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[350px] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
            onCropComplete={handleCropComplete}
            cropShape={aspectRatio === 1 ? "round" : "rect"}
            showGrid={true}
            minZoom={0.5}
            restrictPosition={false}
            objectFit="contain"
            style={{
              containerStyle: {
                width: "100%",
                height: "100%",
                position: "relative",
              },
              cropAreaStyle: {
                transform: `scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
              },
              mediaStyle: {
                transform: `scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
              },
            }}
          />
        </div>

        <div className="space-y-4 px-1">
          {/* Zoom Control */}
          <div className="flex items-center gap-4">
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <Label className="text-sm text-muted-foreground w-16">확대</Label>
            <Slider
              value={[zoom]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
          </div>

          {/* Rotation Control */}
          <div className="flex items-center gap-4">
            <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
            <Label className="text-sm text-muted-foreground w-16">회전</Label>
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={(value) => setRotation(value[0])}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRotate90}
              className="shrink-0 h-8 w-8"
              title="90° 회전"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Flip Controls */}
          <div className="flex items-center gap-4">
            <FlipHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <Label className="text-sm text-muted-foreground w-16">반전</Label>
            <div className="flex gap-2">
              <Button
                variant={flipHorizontal ? "default" : "outline"}
                size="sm"
                onClick={handleFlipHorizontal}
                className="h-8"
              >
                <FlipHorizontal className="h-4 w-4 mr-2" />
                좌우
              </Button>
              <Button
                variant={flipVertical ? "default" : "outline"}
                size="sm"
                onClick={handleFlipVertical}
                className="h-8"
              >
                <FlipVertical className="h-4 w-4 mr-2" />
                상하
              </Button>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={processing}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={processing || !croppedAreaPixels}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              "적용"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
