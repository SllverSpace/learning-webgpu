
class Player {
    constructor(x, y, z) {
        this.pos = {x: x, y: y, z: z}
        this.size = {x: 0.5, y: 1.5, z: 0.5}
        this.vel = {x: 0, y: 0, z: 0}

        this.visual = new webgpu.Box(0, 0, 0, this.size.x, this.size.y, this.size.z, [0, 0.5, 1])
        this.visual.collisions = false
        this.slope = 1
        this.slopeAmt = 0.001
        this.falling = 0
        this.jumpSpeed = 6
        this.gravity = 15
        this.tsize = 1
        this.crouching = false
    }
    tick() {
        let moved = false
        if (this.sprinting) {
            speed *= 2
        }
        if (keys["KeyW"]) {
            this.vel.x += Math.sin(camera.rot.y)*speed*delta
            this.vel.z += Math.cos(camera.rot.y)*speed*delta
            moved = true
        }
        if (keys["KeyS"]) {
            this.vel.x -= Math.sin(camera.rot.y)*speed*delta
            this.vel.z -= Math.cos(camera.rot.y)*speed*delta
            moved = true
        }
        if (keys["KeyA"]) {
            this.vel.x -= Math.cos(camera.rot.y)*speed*delta
            this.vel.z += Math.sin(camera.rot.y)*speed*delta
            moved = true
        }
        if (keys["KeyD"]) {
            this.vel.x += Math.cos(camera.rot.y)*speed*delta
            this.vel.z -= Math.sin(camera.rot.y)*speed*delta
            moved = true
        }
        if (this.sprinting) {
            speed /= 2
        }
        if (!moved) {
            this.sprinting = false
        }
        if (jKeys["Space"] && this.falling < 0.1) {
            this.vel.y = this.jumpSpeed
        }
        if (keys["KeyE"]) {
            this.sprinting = true
        }

        if (!keys["ShiftLeft"] && this.crouching) {
            this.size.y += 0.5
            this.pos.y += 0.25
            if (!this.isColliding()) {
                this.crouching = keys["ShiftLeft"]
            }
            this.size.y -= 0.5
            this.pos.y -= 0.25
        } else {
            this.crouching = keys["ShiftLeft"]
        }
        
        
        if (this.crouching) {
            this.tsize = 0.5
        } else {
            this.tsize = 1.25
        }

        let tfov = 60
        if (this.sprinting) {
            tfov = 80
        }
        fov += (tfov - fov) * delta * 7.5

        let prev = this.isColliding()

        let dif = (this.tsize - this.size.y) * delta * 10
        this.size.y += dif
        this.pos.y += dif/2

        if (this.isColliding() && !prev && !this.crouching) {
            this.size.y -= dif
            this.pos.y -= dif/2
            this.crouching = true
        } else if (prev) {
            this.fixCollision(prev, 0.01)
            // this.pos.y += delta*2
        }

        this.vel.y -= this.gravity*delta
        this.falling += delta

        this.vel.x = lerp(this.vel.x, 0, delta*100*0.1)
        // this.vel.y = lerp(this.vel.y, 0, delta*100*0.1)
        this.vel.z = lerp(this.vel.z, 0, delta*100*0.1)

        if (this.pos.y < -25) {
            this.pos = {x: 0, y: 25, z: 0}
        }
    
        // this.pos.x += this.vel.x*delta
        // if (this.isColliding()) {
        //     this.pos.x -= this.vel.x*delta
        // }

        // this.pos.y += this.vel.y*delta
        // if (this.isColliding()) {
        //     if (this.vel.y < 0) {
        //         this.falling = 0
        //     }
        //     this.pos.y -= this.vel.y*delta
        //     this.vel.y = 0
        // }

        // this.pos.z += this.vel.z*delta
        // if (this.isColliding()) {
        //     this.pos.z -= this.vel.z*delta
        // }
        this.move(this.vel.x*delta, this.vel.y*delta, this.vel.z*delta, 10)

        console.log(this.vel.y)

        this.visual.pos = {...this.pos}
        this.visual.size = {...this.size}
        this.visual.rot.y = camera.rot.y

        camera.pos = {...this.pos}
        camera.pos.y += this.size.y/3
    }
    getCData() {
        let corners = collisions.getBoxCorners(this.pos.x, this.pos.y, this.pos.z, this.size.x, this.size.y, this.size.z, 0, camera.rot.y, 0)
        let axes = collisions.getBoxAxes(0, camera.rot.y, 0)

        return [corners, axes]
    }
    fixCollision(mesh, stepSize, max=10) {
        
        let cData = this.getCData()

        let axeso = mesh.getAxes()
        let axes = []
        for (let axis of axeso) {
            axes.push([axis[0], axis[1], axis[2]])
            axes.push([-axis[0], -axis[1], -axis[2]])
        }

        let axesd = []

        for (let axis of axes) {
            let d = 0
            let colliding = this.isCollidingObj(cData[0], cData[1], mesh)
            while (colliding && d < max) {
                d += stepSize
                this.pos.x += axis[0] * stepSize
                this.pos.y += axis[1] * stepSize
                this.pos.z += axis[2] * stepSize
                cData = this.getCData()
                colliding = this.isCollidingObj(cData[0], cData[1], mesh)
            }
            this.pos.x -= axis[0] * d
            this.pos.y -= axis[1] * d
            this.pos.z -= axis[2] * d
            cData = this.getCData()
            axesd.push([axis, d])
        }
        axesd.sort((a, b) => a[1] - b[1])
        this.pos.x += axesd[0][0][0] * axesd[0][1]
        this.pos.y += axesd[0][0][1] * axesd[0][1]
        this.pos.z += axesd[0][0][2] * axesd[0][1]
        this.vel.x += axesd[0][0][0] * axesd[0][1] * mesh.push
        this.vel.y += axesd[0][0][1] * axesd[0][1] * mesh.push
        this.vel.z += axesd[0][0][2] * axesd[0][1] * mesh.push
    }
    move(x, y, z, steps) {
        steps = Math.round(steps)

        for (let i = 0; i < steps; i++) {
            this.pos.x += x / steps
            if (this.isColliding()) {
                this.pos.y += this.slope * Math.abs(x / steps)
                if (!this.isColliding()) {
                    this.pos.y -= this.slope * Math.abs(x / steps)
                    while (this.isColliding()) {
                        this.pos.y += this.slopeAmt
                    }
                } else {
                    this.pos.y -= this.slope * Math.abs(x / steps) * 2
                    if (!this.isColliding()) {
                        this.pos.y += this.slope * Math.abs(x / steps)
                        while (this.isColliding()) {
                            this.pos.y -= this.slopeAmt
                        }
                    } else {
                        this.pos.y += this.slope * Math.abs(x / steps)
                        this.pos.x -= x / steps
                        this.vx = 0
                        break
                    }
                }
            } else if (y < 0) {
                this.pos.y -= this.slope*1.5 * Math.abs(x / steps)
                if (this.isColliding()) {
                    this.pos.y += this.slope*1.5 * Math.abs(x / steps)
                    while (!this.isColliding()) {
                        this.pos.y -= this.slopeAmt
                    }
                    this.pos.y += this.slopeAmt
                } else {
                    this.pos.y += this.slope*1.5 * Math.abs(x / steps)
                }
            }
        }

        // for (let i = 0; i < steps; i++) {
        //     this.pos.x += x / steps
        //     if (this.isColliding()) {
        //         this.pos.x -= x / steps
        //         break
        //     }
        // }

        for (let i = 0; i < steps; i++) {
            this.pos.z += z / steps
            if (this.isColliding()) {
                this.pos.y += this.slope * Math.abs(z / steps)
                if (!this.isColliding()) {
                    this.pos.y -= this.slope * Math.abs(z / steps)
                    while (this.isColliding()) {
                        this.pos.y += this.slopeAmt
                    }
                } else {
                    this.pos.y -= this.slope * Math.abs(z / steps) * 2
                    if (!this.isColliding()) {
                        this.pos.y += this.slope * Math.abs(z / steps)
                        while (this.isColliding()) {
                            this.pos.y -= this.slopeAmt
                        }
                    } else {
                        this.pos.y += this.slope * Math.abs(z / steps)
                        this.pos.z -= z / steps
                        this.vz = 0
                        break
                    }
                }
            } else if (y < 0) {
                this.pos.y -= this.slope*1.5 * Math.abs(z / steps)
                if (this.isColliding()) {
                    this.pos.y += this.slope*1.5 * Math.abs(z / steps)
                    while (!this.isColliding()) {
                        this.pos.y -= this.slopeAmt
                    }
                    this.pos.y += this.slopeAmt
                } else {
                    this.pos.y += this.slope*1.5 * Math.abs(z / steps)
                }
            }
        }

        // for (let i = 0; i < steps; i++) {
        //     this.pos.z += z / steps
        //     if (this.isColliding()) {
        //         this.pos.z -= z / steps
        //         break
        //     }
        // }

        for (let i = 0; i < steps; i++) {
            this.pos.y += y / steps
            if (this.isColliding()) {
                this.pos.y -= y / steps
                if (y < 0) {
                    this.falling = 0
                }
                this.vel.y = 0
                break
            }
        }
    }
    isCollidingObj(corners, axes, mesh) {
        if (!mesh.collisions) return false
        if (mesh.isBox) {
            if (Math.sqrt((this.pos.x-mesh.pos.x)**2 + (this.pos.y-mesh.pos.y)**2 + (this.pos.z-mesh.pos.z)**2) < Math.max(this.size.x, this.size.y, this.size.z)*1.5 + Math.max(mesh.size.x, mesh.size.y, mesh.size.z)*1.5) {
                if (collisions.BoxRToBoxR(this.pos.x, this.pos.y, this.pos.z, corners, axes, mesh.pos.x, mesh.pos.y, mesh.pos.z, mesh.getCorners(), mesh.getAxes())) {
                    // console.log(mesh)
                    return true
                }
            }
            // if (mesh.rotated) {
                
            // } else {
            //     if (collisions.BoxToBox(this.pos.x, this.pos.y, this.pos.z, this.size.x, this.size.y, this.size.z, mesh.pos.x, mesh.pos.y, mesh.pos.z, mesh.size.x, mesh.size.y, mesh.size.z)) {
            //         return true
            //     }
            // }
        } else if (mesh.isSphere) {
            if (Math.sqrt((this.pos.x-mesh.pos.x)**2 + (this.pos.y-mesh.pos.y)**2 + (this.pos.z-mesh.pos.z)**2) < Math.max(this.size.x, this.size.y, this.size.z)*1.5 + mesh.radius) {
                if (collisions.BoxRToSphere(corners, mesh.pos.x, mesh.pos.y, mesh.pos.z, mesh.radius)) {
                    return true
                }
            }
        }
        return false
    }
    isColliding() {
        let cData = this.getCData()

        for (let mesh of webgpu.meshes) {
            let colliding = this.isCollidingObj(cData[0], cData[1], mesh)
            if (colliding) {
                return mesh
            }
        }
        return false
    }
}