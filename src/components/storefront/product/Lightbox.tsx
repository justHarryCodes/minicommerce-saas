"use client";

// Full-screen photo viewer with pinch / scroll zoom and swipe. Loaded only
// when a shopper first opens a photo.
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

export default function ProductLightbox({
  images,
  index,
  open,
  onClose,
  onIndex,
  alt,
}: {
  images: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndex: (i: number) => void;
  alt: string;
}) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      on={{ view: ({ index: i }) => onIndex(i) }}
      slides={images.map((src) => ({ src, alt }))}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      carousel={{ finite: images.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
      styles={{ container: { backgroundColor: "rgba(0,0,0,.94)" } }}
    />
  );
}
