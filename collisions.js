
class Collisions {
    RectToRect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return Math.abs(x1-x2) < w1/2+w2/2 && Math.abs(y1-y2) < h1/2+h2/2
    }
    BoxToBox(x1, y1, z1, w1, h1, d1, x2, y2, z2, w2, h2, d2) {
        return Math.abs(x1-x2) < w1/2+w2/2 && Math.abs(y1-y2) < h1/2+h1/2 && Math.abs(z1-z2) < d1/2+d1/2
    }
    BoxRToBoxR() {

    }
    CircleToCircle(x1, y1, r1, x2, y2, r2) {
        return Math.sqrt((x2-x1)**2 + (y2-y1)**2) < r1+r2
    }
    SphereToSphere(x1, y1, z1, r1, x2, y2, z2, r2) {
        return Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2) < r1+r2
    }
}

var collisions = new Collisions()