
var grassShaders = `
    struct Light {
        dir: vec3<f32>,
        colour: vec3<f32>
    }

    struct Material {
        ambient: vec3<f32>,
        diffuse: vec3<f32>,
        specular: vec3<f32>,
        shininess: f32,
    }

    struct Scene {
        view: mat4x4<f32>,
        projection: mat4x4<f32>,
        light: Light,
        camera: vec3<f32>,
        lightView: mat4x4<f32>
    }

    struct Obj {
        model: mat4x4<f32>,
        normal: mat4x4<f32>,
        useTexture: u32,
        material: Material
    }

    @group(0) @binding(0) var<uniform> uScene: Scene;
    @group(0) @binding(1) var<uniform> uObj: Obj;

    @group(0) @binding(2) var uTexture: texture_2d<f32>;

    @group(0) @binding(3) var shadowTexture: texture_depth_2d;
    @group(0) @binding(4) var shadowSampler: sampler_comparison;

    @group(0) @binding(5) var<uniform> time: f32;
    
    // @group(0) @binding(0) var<uniform> uView: mat4x4<f32>;
    // @group(0) @binding(1) var<uniform> uProjection: mat4x4<f32>;
    // @group(0) @binding(2) var<uniform> uModel: mat4x4<f32>;
    // @group(0) @binding(3) var<uniform> uNormal: mat4x4<f32>;
    // @group(0) @binding(4) var uSampler: sampler;
    // @group(0) @binding(5) var uTexture: texture_2d<f32>;
    // @group(0) @binding(6) var<uniform> useTexture: u32;
    // @group(0) @binding(7) var<uniform> light: Light;
    // @group(0) @binding(8) var<uniform> material: Material;
    // @group(0) @binding(9) var<uniform> camera: vec3<f32>;
    // @group(0) @binding(10) var<uniform> time: f32;
    // @group(0) @binding(11) var shadowTexture: texture_depth_2d;
    // @group(0) @binding(12) var<uniform> lightView: mat4x4<f32>;
    // @group(0) @binding(13) var shadowSampler: sampler_comparison;

    struct VertexOut {
    @builtin(position) position : vec4f,
    @location(0) color : vec4f,
    @location(1) normal : vec3f,
    @location(2) uv : vec2f,
    @location(3) pos : vec3f
    }

    fn hash(seed: u32) -> f32 {
        var x = u32(seed);
        x = ((x >> 16u) ^ x) * 0x45d9f3bu;
        x = ((x >> 16u) ^ x) * 0x45d9f3bu;
        x = (x >> 16u) ^ x;
        return f32(x) / f32(0xffffffffu);
    }

    @vertex
    fn vertex_main(@builtin(vertex_index) vertexIndex: u32, @location(0) position: vec4f,
                @location(1) color: vec4f, @location(2) normal: vec3f, @location(3) uv: vec2f, @location(4) id: f32) -> VertexOut
    {  
        var normal2 = normal;
        var gridSize : f32 = 300;
        var size : f32 = 20 / gridSize;

        var pos : vec4<f32> = position;
        var id2 = round(id * gridSize * gridSize);
        var x = round(id2 / gridSize - 0.5);
        var y = id2 % gridSize;

        let topIndex = u32(floor(f32(vertexIndex/3)));
        var top = vertexIndex % 3 == 0;

        var off : vec2<f32> = vec2(0, 0);

        pos.x += (hash(u32(id2))*2-1) / 5;
        pos.z += (hash(u32(id2 + 94823))*2-1) / 5;

        off.x += (hash(vertexIndex)*2-1) * size*1.5;
        off.y += (hash(vertexIndex+493045)*2-1) * size*1.5;

        let spread = 3.0;

        var diff = vec2f(
            sin(time + (x/gridSize)*15/spread) * cos(time + 29483 + (x/gridSize)*25/spread) * size, 
            sin(time + 58294 + (y/gridSize)*27/spread) * cos(time + 48484 + (x/gridSize)*13/spread) * size
        );
        
        if (top) {
            pos.x += diff.x;
            pos.z += diff.y;
        }

        var moved : f32 = 10;

        var d = sqrt(pow((uScene.camera.x-pos.x+moved), 2) + pow((uScene.camera.y-pos.y+1) / 2, 2) + pow((uScene.camera.z-pos.z+moved), 2))/1.5;
        var factor = 1.0-min(1, max(0, d));

        // diff.x += hash(vertexIndex)*2-1;
        // diff.y += hash(vertexIndex+493045)*2-1;

        normal2 = vec3f(-diff.x / size, 1, -diff.y / size);

        if (top) {
            pos.x += (off.x) * (factor*3);
            pos.z += (off.y) * (factor*3);
            pos.y -= factor/2 * size * 7.5 * 2;
        } else {
            pos.x += off.x;
            pos.z += off.y;
        }

        normal2.y += factor*50;

        normal2 = normalize(normal2);

        let translated = uObj.model * vec4<f32>(pos.xyz, 1.0);

        var output : VertexOut;
        output.position = uScene.projection * uScene.view * translated;
        output.color = color;
        output.normal = normalize((uObj.normal * vec4(normal2.x, normal2.y, normal2.z, 0)).xyz);
        output.normal.z = -output.normal.z;
        output.uv = uv;
        output.pos = vec3<f32>(translated[0], translated[1], -translated[2]);
        return output;
    }

    

    @fragment
    fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
    {
        var vertexColour = fragData.color;
        if (uObj.useTexture != 0u) {
            vertexColour = textureLoad(uTexture, vec2u((fragData.uv % vec2f(1.0, 1.0)) *vec2f(textureDimensions(uTexture))), 0) * fragData.color;
        }

        let normal = normalize(fragData.normal);
        let lightDir = normalize(-uScene.light.dir);
        let viewDir = normalize(uScene.camera - fragData.pos);
        let reflectDir = reflect(-lightDir, normal);

        let ambient = uScene.light.colour * uObj.material.ambient;

        let diff = max(dot(normal, lightDir), 0.0);
        let diffuse = uObj.material.diffuse * diff * uScene.light.colour;

        let spec = pow(max(dot(viewDir, reflectDir), 0.0), uObj.material.shininess);
        let specular = uObj.material.specular * spec * uScene.light.colour;

        let size = textureDimensions(shadowTexture);
        let sx = 1.0 / f32(size.x);
        let sy = 1.0 / f32(size.y);

        let fragPosLightSpace = uScene.lightView * vec4f(fragData.pos.x, fragData.pos.y, -fragData.pos.z, 1.0);
        let fragPos = vec3(
            fragPosLightSpace.xy * vec2(0.5, -0.5) + vec2(0.5),
            fragPosLightSpace.z
        );

        let inRange = (
            fragPos.x >= 0 &&
            fragPos.x <= 1 &&
            fragPos.y >= 0 &&
            fragPos.y <= 1
        );

        var vis = 0.0;
        let bias = -0.0001;
        let blur = 0.01;

        for (var x = 0; x < 3; x++) {
            for (var y = 0; y < 3; y++) {
                let offset = vec2f(f32(x-1)*sx, f32(y-1)*sy);
                // let depth = textureSample(shadowTexture, uSampler, fragPos.xy+offset);
                vis += textureSampleCompare(
                    shadowTexture,
                    shadowSampler,
                    fragPos.xy+offset,
                    fragPos.z + bias,
                );
            }
        }

        var shadow = vis / 9.0;
        var shadowFactor = 1.0;
        if inRange {
            shadowFactor = min((1.0 - shadow) + 0.1, 1.0);
        }

        let colour = ambient + (diffuse + specular) * shadowFactor;

        return vertexColour * vec4f(colour, 1);
    }
`
var grassVertexConfig = {
    entryPoint: "vertex_main",
    buffers: [
        {
            arrayStride: 13 * 4,
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
                },
                {
                    shaderLocation: 2,
                    offset: 4 * 7,
                    format: "float32x3"
                },
                {
                    shaderLocation: 3,
                    offset: 4 * 10,
                    format: "float32x2"
                },
                {
                    shaderLocation: 4,
                    offset: 4 * 12,
                    format: "float32"
                }
            ]
        }
    ]
}
var grassUniforms = {
    scene: [null, 0, 60*4, 2, true],
    obj: [null, 1, 49*4, 2, false],
    texture: [null, 2, 0, 1, false, true, {texture: {sampleType: "float"}}],
    shadowTexture: [null, 3, 0, 1, false, true, {texture: {sampleType: "depth"}}],
    shadowSampler: [null, 4, 0, 1, false, true, {sampler: {type: "comparison"}}],
    time: [null, 5, 4, 0, true],
}