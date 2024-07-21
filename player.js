
class Player {
    constructor(x, y, z) {
        this.pos = {x: x, y: y, z: z}
        this.size = {x: 1, y: 1, z: 1}
        this.vel = {x: 0, y: 0, z: 0}
    }
    tick() {
        if (keys["KeyW"]) {
            this.vel.x += Math.sin(camera.rot.y)*speed*delta
            this.vel.z += Math.cos(camera.rot.y)*speed*delta
        }
        if (keys["KeyS"]) {
            this.vel.x -= Math.sin(camera.rot.y)*speed*delta
            this.vel.z -= Math.cos(camera.rot.y)*speed*delta
        }
        if (keys["KeyA"]) {
            this.vel.x -= Math.cos(camera.rot.y)*speed*delta
            this.vel.z += Math.sin(camera.rot.y)*speed*delta
        }
        if (keys["KeyD"]) {
            this.vel.x += Math.cos(camera.rot.y)*speed*delta
            this.vel.z -= Math.sin(camera.rot.y)*speed*delta
        }
        if (keys["Space"]) {
            this.vel.y += speed*delta
        }
        if (keys["ShiftLeft"]) {
            this.vel.y -= speed*delta
        }

        this.vel.x = lerp(this.vel.x, 0, delta*100*0.1)
        this.vel.y = lerp(this.vel.y, 0, delta*100*0.1)
        this.vel.z = lerp(this.vel.z, 0, delta*100*0.1)
    
        this.pos.x += this.vel.x*delta
        this.pos.y += this.vel.y*delta
        this.pos.z += this.vel.z*delta

        camera.pos = {...this.pos}
    }
    isColliding() {
        for (let mesh of webgpu.meshes) {
            if (mesh.isBox) {
                if (mesh.rotated) {
                    return false
                } else {
                    return collisions.BoxToBox(this.pos.x, this.pos.y, this.pos.z, this.size.x, this.size.y, this.size.z, mesh.pos.x, mesh.pos.y, mesh.pos.z, mesh.size.x, mesh.size.y, mesh.size.z)
                }
            }
        }
    }
}