
class Collisions {
    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    }
    cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ]
    }
    normalize(a) {
        let length = Math.sqrt(a[0]**2 + a[1]**2 + a[2]**2)
        if (length > 0) {
            a[0] /= length
            a[1] /= length
            a[2] /= length
        }
        return a
    }
    project(vertices, axis) {
        let min = Infinity
        let max = -Infinity
        for (let vertex of vertices) {
            let projection = this.dot(vertex, axis)
            min = Math.min(min, projection)
            max = Math.max(max, projection)
        }
        return [min, max]
    }
    el(vec) {
        return [vec.x, vec.y, vec.z]
    }
    rotv3(x, y, z, rx, ry, rz) {
        return this.el(rotv3(vec3(x, y, z), vec3(rx, ry, rz)))
    }
    getBoxCorners(x, y, z, sx, sy, sz, rx, ry, rz) {
        let rot = [rx, ry, -rz]
        let corners = [
            [...this.rotv3(-sx/2, -sy/2, -sz/2, ...rot)],
            [...this.rotv3(sx/2, -sy/2, -sz/2, ...rot)],
            [...this.rotv3(-sx/2, -sy/2, sz/2, ...rot)],
            [...this.rotv3(sx/2, -sy/2, sz/2, ...rot)],
            [...this.rotv3(-sx/2, sy/2, -sz/2, ...rot)],
            [...this.rotv3(sx/2, sy/2, -sz/2, ...rot)],
            [...this.rotv3(-sx/2, sy/2, sz/2, ...rot)],
            [...this.rotv3(sx/2, sy/2, sz/2, ...rot)],
        ]

        for (let corner of corners) {
            corner[0] += x
            corner[1] += y
            corner[2] += z
        }

        return corners
    }
    getBoxAxes(rx, ry, rz) {
        let rot = [rx, ry, -rz]
        let axes = [
            [...this.rotv3(1, 0, 0, ...rot)],
            [...this.rotv3(0, 1, 0, ...rot)],
            [...this.rotv3(0, 0, 1, ...rot)],
        ]
        return axes
    }
    RectToRect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return (
            x1 + w1/2 > x2 - w2/2 &&
            x1 - w1/2 < x2 + w2/2 &&
            y1 + h1/2 > y2 - h2/2 &&
            y1 - h1/2 < y2 + h2/2 
        )
        // return Math.abs(x1-x2) < w1/2+w2/2 && Math.abs(y1-y2) < h1/2+h2/2
    }
    BoxToBox(x1, y1, z1, w1, h1, d1, x2, y2, z2, w2, h2, d2) {
        return (
            x1 + w1/2 > x2 - w2/2 &&
            x1 - w1/2 < x2 + w2/2 &&
            y1 + h1/2 > y2 - h2/2 &&
            y1 - h1/2 < y2 + h2/2 &&
            z1 + d1/2 > z2 - d2/2 &&
            z1 - d1/2 < z2 + d2/2
        )
        // return Math.abs(x1-x2) < w1/2+w2/2 && Math.abs(y1-y2) < h1/2+h1/2 && Math.abs(z1-z2) < d1/2+d1/2
    }
    BoxRToBoxR(x1, y1, z1, v1, a1, x2, y2, z2, v2, a2) {
        let axes = [
            ...a1,
            ...a2
        ]
        for (let edge1 of a1) {
            for (let edge2 of a2) {
                axes.push(this.cross(edge1, edge2))
            }
        }
        for (let axis of axes) {
            if (axis[0] != 0 || axis[1] != 0 || axis[2] != 0) {
                axis = this.normalize(axis)

                // let proj1 = v1.map(v => this.dot([v[0] - x1, v[1] - y1, v[2] - z1], axis))
                // let proj2 = v2.map(v => this.dot([v[0] - x2, v[1] - y2, v[2] - z2], axis))

                // let min1 = Math.min(...proj1)
                // let max1 = Math.max(...proj1)
                // let min2 = Math.min(...proj2)
                // let max2 = Math.max(...proj2)

                let [min1, max1] = this.project(v1, axis)
                let [min2, max2] = this.project(v2, axis)

                if (max1 < min2 || max2 < min1) {
                    // console.log("yip?")
                    return false
                }
            }
        }
        return true
    }
    CircleToCircle(x1, y1, r1, x2, y2, r2) {
        return Math.sqrt((x2-x1)**2 + (y2-y1)**2) < r1+r2
    }
    SphereToSphere(x1, y1, z1, r1, x2, y2, z2, r2) {
        return Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2) < r1+r2
    }
    BoxRToSphere(corners, x2, y2, z2, r2) {
        let cd = -1
        for (let corner of corners) {
            let d = Math.sqrt((x2-corner[0])**2 + (y2-corner[1])**2 + (z2-corner[2])**2)
            if (cd == -1 || d < cd) {   
                cd = d
            }
        }
        return cd < r2
    }
}

var collisions = new Collisions()