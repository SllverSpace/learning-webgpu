
utils.setup()
utils.setStyles()
utils.setGlobals()

var fov = 60
var camera = {pos: {x: 0, y: 0, z: 0}, rot: {x: 0, y: 0, z: 0}}

function getViewMatrix() {
    let view = mat4.create()
    let projection = mat4.create()
    mat4.perspective(projection, fov * Math.PI / 180, gpucanvas.width / gpucanvas.height, 0.01, 5000)

    mat4.translate(view, view, [camera.pos.x, camera.pos.y, -camera.pos.z])
    mat4.rotateY(view, view, -camera.rot.y)
    mat4.rotateX(view, view, -camera.rot.x)
    mat4.rotateZ(view, view, -camera.rot.z)
    mat4.invert(view, view)

    return mat4.multiply(mat4.create(), projection, view)
}

function getModelMatrix(x, y, z, rotx, roty, rotz) {
    let model = mat4.create()

    mat4.translate(model, model, [x, y, -z])
    mat4.rotateY(model, model, -roty)
    mat4.rotateX(model, model, -rotx)
    mat4.rotateZ(model, model, -rotz)

    mat4.scale(model, model, [1, 1, -1])

    // mat4.invert(model, model)

    return model
}

webgpu.onReady = () => {requestAnimationFrame(frame)}

webgpu.setup()
webgpu.setStyles()

var coolCube = new webgpu.Texture("cool-cube.png")
var edges = new webgpu.Texture("edges-2.png")

var grid = []

let grassSize = 0.25
for (let x = 0; x < 30; x++) {
    for (let y = 0; y < 1; y++) {
        for (let z = 0; z < 30; z++) {
            var test = new webgpu.Mesh(x*grassSize - 9, y-0.5, z*grassSize+y/10 - 9, 1, 1, 1, [
                0, 3*grassSize, 0,
                -0.5*grassSize, 0, 0,
                0.5*grassSize, 0, 0
            ],
            [
                0, 1, 2
            ],[
                0, 1, 0, 1,
                0, 0.5, 0, 1,
                0, 0.5, 0, 1
            ])
            test.rot.y = Math.sin((x*20+z) * 1000) * Math.PI
            grid.push(test)
        }
    }
}


var test2 = new webgpu.Mesh(-3, 0, 0, 1, 1, 1, [
    0, 1, 0,
    0, 0, 0,
    1, 0, 0
],[
    0, 1, 2
],[
    1, 0, 0, 1,
    0, 1, 0, 1,
    0, 0, 1, 1
])

var coolBox = new webgpu.Box(0, 0, -3, 1, 1, 1, [0, 0.5, 1])
coolBox.setTexture(coolCube)
coolBox.setUvs()

var ground = new webgpu.Mesh(0, -0.5, 0, 1, 1, 1, [
    -10, 0, -10,
    10, 0, 10,
    -10, 0, 10,
    10, 0, -10
],[
    0, 3, 1,
    0, 1, 2
],[
    0, 0.5, 0, 1,
    0, 1, 0, 1,
    0, 0.75, 0, 1,
    0, 0.65, 0, 1
])
ground.oneSide = true

var ttest1 = new webgpu.Box(-2, 1, 4, 1, 1, 1, [1, 0, 0, 1])
var ttest2 = new webgpu.Box(0, 1, 4, 1, 1, 1, [0, 1, 0, 1])
var ttest3 = new webgpu.Box(2, 1, 4, 1, 1, 1, [0, 0, 1, 1])

ttest1.setTexture(edges)
ttest1.setUvs()

var delta = 0
var lastTime = 0
var su = 0

var time = 0

var speed = 3

var viewProjection

function frame(timestamp) {

    utils.getDelta(timestamp)
    ui.resizeCanvas()
    ui.getSu()
    input.setGlobals()

    time += delta

    gpucanvas.width = window.innerWidth
    gpucanvas.height = window.innerHeight

    if (keys["KeyW"]) {
        camera.pos.x += Math.sin(camera.rot.y)*speed*delta
        camera.pos.z += Math.cos(camera.rot.y)*speed*delta
    }
    if (keys["KeyS"]) {
        camera.pos.x -= Math.sin(camera.rot.y)*speed*delta
        camera.pos.z -= Math.cos(camera.rot.y)*speed*delta
    }
    if (keys["KeyA"]) {
        camera.pos.x -= Math.cos(camera.rot.y)*speed*delta
        camera.pos.z += Math.sin(camera.rot.y)*speed*delta
    }
    if (keys["KeyD"]) {
        camera.pos.x += Math.cos(camera.rot.y)*speed*delta
        camera.pos.z -= Math.sin(camera.rot.y)*speed*delta
    }
    if (keys["Space"]) {
        camera.pos.y += speed*delta
    }
    if (keys["ShiftLeft"]) {
        camera.pos.y -= speed*delta
    }

    if (mouse.lclick) {
        input.lockMouse()
    }

    viewProjection = getViewMatrix()
    
    test2.rot.y = time

    let i = 0
    for (let mesh of grid) {
        mesh.rot.x = 2 - Math.max(Math.min(Math.sqrt((camera.pos.x-mesh.pos.x)**2 + (((camera.pos.y-1-mesh.pos.y)**2)/2) + (camera.pos.z-mesh.pos.z)**2)/1.5, 1), 0)*2
        mesh.rot.x += Math.sin(time + (mesh.pos.x+mesh.pos.z)/3) / 5
        i++
    }

    device.queue.writeBuffer(webgpu.uniforms.view[0], 0, viewProjection, 0, viewProjection.length)

    webgpu.render([0.4, 0.8, 1, 1])

    input.updateInput()

    requestAnimationFrame(frame)
}

var sensitivity = 0.002

input.mouseMove = (event) => {
    input.mouse.x = event.clientX/ui.scale
    input.mouse.y = event.clientY/ui.scale

    if (input.isMouseLocked()) {
        camera.rot.x += event.movementY*sensitivity
		if (camera.rot.x > Math.PI/2*0.99) {
			camera.rot.x = Math.PI/2*0.99
		}
		if (camera.rot.x < -Math.PI/2*0.99) {
			camera.rot.x = -Math.PI/2*0.99
		}

        camera.rot.y += event.movementX * sensitivity
    }
}