
utils.setup()
utils.setStyles()
utils.setGlobals()

const clearColor = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }

const vertices = new Float32Array([
    0.0, 0.0, 0,    1, 0, 0, 1,
    0.0, 0.5, 0,    1, 1, 0, 1,
    0.5, 0.0, 0,    0, 1, 0, 1,
    0.5, 0.5, 0,    0, 0, 1, 1,
    1.0, 0.5, -1.0, 0, 0, 1, 1,

    0.0, 0.0, -1.0, 1, 0, 0, 1,
    0.0, 0.5, -1.0, 1, 0, 0, 1,
    0.5, 0.0, -1.0, 1, 0, 0, 1
])

const indexes = new Uint32Array([
    3, 1, 0,
    0, 2, 3,
    4, 1, 0,

    7, 6, 5
])

const shaders = `
struct ColorUniforms {
    color: vec4<f32>
}

struct ViewUniforms {
    view: mat4x4<f32>
}

struct ModelUniforms {
    model: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> colorUniforms: ColorUniforms;
@group(0) @binding(1) var<uniform> viewUniforms: ViewUniforms;
@group(0) @binding(2) var<uniform> modelUniforms: ModelUniforms;

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@vertex
fn vertex_main(@location(0) position: vec4f,
               @location(1) color: vec4f) -> VertexOut
{
    var output : VertexOut;
    output.position = viewUniforms.view * modelUniforms.model * vec4<f32>(position.xyz, 1.0);
    output.color = color;
    return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
    
    return fragData.color;
}
`

var device
var context
var renderPipeline
var vertexBuffer
var indexBuffer
var colourUBuffer
var bindGroup
var viewBuffer
var modelBuffer
var depthTexture

var colourData = new Float32Array([
    0, 0, 0, 1
])

var gpucanvas = document.getElementById("gpucanvas")
gpucanvas.style.position = "absolute"
gpucanvas.style.left = 0
gpucanvas.style.top = 0

var fov = 60
var camera = {pos: {x: 0, y: 0, z: -3}, rot: {x: 0, y: 0, z: 0}}

function getViewMatrix() {
    let view = mat4.create()
    let projection = mat4.create()
    mat4.perspective(projection, fov * Math.PI / 180, gpucanvas.width / gpucanvas.height, 0.01, 5000)

    mat4.translate(view, view, [-camera.pos.x, camera.pos.y, -camera.pos.z])
    mat4.rotateY(view, view, -camera.rot.y)
    mat4.rotateX(view, view, -camera.rot.x)
    mat4.rotateZ(view, view, -camera.rot.z)
    mat4.invert(view, view)

    return mat4.multiply(mat4.create(), projection, view)
}

function getModelMatrix(x, y, z, rotx, roty, rotz) {
    let model = mat4.create()

    mat4.translate(model, model, [x, y, z])
    mat4.rotateY(model, model, roty)
    mat4.rotateX(model, model, rotx)
    mat4.rotateZ(model, model, rotz)

    return model
}

async function init() {
    if (!navigator.gpu) {
        throw Error('WebGPU not supported.');
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
        throw Error('Couldn\'t request WebGPU adapter.')
    }

    device = await adapter.requestDevice()

    const shaderModule = device.createShaderModule({
        code: shaders
    })

    context = gpucanvas.getContext("webgpu")

    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: 'premultiplied'
    })

    vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length)
    indexBuffer = device.createBuffer({
        size: indexes.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })

    device.queue.writeBuffer(indexBuffer, 0, indexes, 0, indexes.length)

    colourUBuffer = device.createBuffer({
        size: colourData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    let viewMatrix = getViewMatrix()

    viewBuffer = device.createBuffer({
        size: viewMatrix.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    let modelMatrix = getModelMatrix(0, 0, 0, 0, 0, 0)

    modelBuffer = device.createBuffer({
        size: modelMatrix.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' }
            }
        ]
    })

    bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: colourUBuffer
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: viewBuffer
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: modelBuffer
                }
            }
        ]
    })



    var pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
    })

    renderPipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: "vertex_main",
            buffers: [
                {
                    arrayStride: 7 * 4,
                    attributes: [
                        {
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x3"
                        },
                        {
                            shaderLocation: 1,
                            offset: 4 * 3,
                            format: "float32x4"
                        }
                    ]
                }
            ]
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [
                {format: navigator.gpu.getPreferredCanvasFormat()}
            ]
        },
        primitive: {
            topology: "triangle-list",
            // cullMode: "back",
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus",
        },
    })
        
    requestAnimationFrame(frame)
}

init()

var delta = 0
var lastTime = 0
var su = 0

var time = 0

var speed = 2

function frame(timestamp) {

    utils.getDelta(timestamp)
    ui.resizeCanvas()
    ui.getSu()
    input.setGlobals()

    time += delta

    gpucanvas.width = window.innerWidth
    gpucanvas.height = window.innerHeight

    if (keys["KeyW"]) {
        camera.pos.x -= Math.sin(camera.rot.y)*speed*delta
        camera.pos.z += Math.cos(camera.rot.y)*speed*delta
    }
    if (keys["KeyS"]) {
        camera.pos.x += Math.sin(camera.rot.y)*speed*delta
        camera.pos.z -= Math.cos(camera.rot.y)*speed*delta
    }
    if (keys["KeyA"]) {
        camera.pos.x += Math.cos(camera.rot.y)*speed*delta
        camera.pos.z += Math.sin(camera.rot.y)*speed*delta
    }
    if (keys["KeyD"]) {
        camera.pos.x -= Math.cos(camera.rot.y)*speed*delta
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

    var viewProjection = getViewMatrix()
    var modelMatrix = getModelMatrix(Math.sin(time), 0, 0, 0, 0, 0)

    device.queue.writeBuffer(colourUBuffer, 0, colourData, 0, colourData.length)
    device.queue.writeBuffer(viewBuffer, 0, viewProjection, 0, viewProjection.length)
    device.queue.writeBuffer(modelBuffer, 0, modelMatrix, 0, modelMatrix.length)

    const commandEncoder = device.createCommandEncoder()

    depthTexture = device.createTexture({
        size: [gpucanvas.width, gpucanvas.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })

    const renderPassDescriptor = {
      colorAttachments: [{
        clearValue: clearColor,
        loadOp: 'clear',
        storeOp: 'store',
        view: context.getCurrentTexture().createView()
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    }
  
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
      
    passEncoder.setPipeline(renderPipeline)

    passEncoder.setVertexBuffer(0, vertexBuffer)
    passEncoder.setIndexBuffer(indexBuffer, "uint32")
    passEncoder.setBindGroup(0, bindGroup)

    passEncoder.drawIndexed(indexes.length, 1, 0, 0, 0)
  
    passEncoder.end()
  
    device.queue.submit([commandEncoder.finish()])

    input.updateInput()

    requestAnimationFrame(frame)
}

var sensitivity = 0.002

input.mouseMove = (event) => {
    this.mouse.x = event.clientX/ui.scale
    this.mouse.y = event.clientY/ui.scale

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