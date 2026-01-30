#!/usr/bin/env python3
"""
测试房源图片上传功能
"""
import requests
import os
from pathlib import Path

# 配置
BASE_URL = "http://localhost:6200"
ADMIN_TOKEN = "LLJKLJAFJKLK87987289739skjkwhhh"  # 从ecosystem.config.js获取
UPLOAD_ENDPOINT = f"{BASE_URL}/api/v1/admin/upload/image"

# 创建一个测试图片文件
def create_test_image():
    """创建一个简单的测试PNG图片"""
    # 创建一个1x1像素的PNG图片（最小有效PNG）
    png_data = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D,  # IHDR chunk length
        0x49, 0x48, 0x44, 0x52,  # IHDR
        0x00, 0x00, 0x00, 0x01,  # width: 1
        0x00, 0x00, 0x00, 0x01,  # height: 1
        0x08, 0x02, 0x00, 0x00, 0x00,  # bit depth, color type, compression, filter, interlace
        0x90, 0x77, 0x53, 0xDE,  # CRC
        0x00, 0x00, 0x00, 0x0C,  # IDAT chunk length
        0x49, 0x44, 0x41, 0x54,  # IDAT
        0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,  # compressed data
        0x0D, 0x0A, 0x2D, 0xB4,  # CRC
        0x00, 0x00, 0x00, 0x00,  # IEND chunk length
        0x49, 0x45, 0x4E, 0x44,  # IEND
        0xAE, 0x42, 0x60, 0x82   # CRC
    ])
    
    test_file = Path("/tmp/test_upload.png")
    test_file.write_bytes(png_data)
    return test_file

def test_upload():
    """测试图片上传"""
    print(f"测试上传API: {UPLOAD_ENDPOINT}")
    
    # 创建测试图片
    test_image = create_test_image()
    print(f"创建测试图片: {test_image}")
    
    # 准备上传
    headers = {
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    }
    
    files = {
        "file": ("test.png", open(test_image, "rb"), "image/png")
    }
    
    try:
        # 发送上传请求
        print("\n发送上传请求...")
        response = requests.post(UPLOAD_ENDPOINT, headers=headers, files=files, timeout=10)
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("url"):
                print(f"\n✓ 上传成功!")
                print(f"  图片URL: {data['url']}")
                
                # 验证图片是否可以访问
                image_url = f"{BASE_URL}{data['url']}"
                print(f"\n验证图片访问: {image_url}")
                img_response = requests.get(image_url, timeout=10)
                if img_response.status_code == 200:
                    print(f"✓ 图片可以正常访问 (大小: {len(img_response.content)} bytes)")
                    return True
                else:
                    print(f"✗ 图片无法访问 (状态码: {img_response.status_code})")
                    return False
            else:
                print(f"\n✗ 上传失败: {data.get('error', '未知错误')}")
                return False
        else:
            print(f"\n✗ 上传失败 (状态码: {response.status_code})")
            return False
            
    except Exception as e:
        print(f"\n✗ 请求异常: {e}")
        return False
    finally:
        files["file"][1].close()
        test_image.unlink()  # 删除测试文件

if __name__ == "__main__":
    print("=" * 60)
    print("房源图片上传功能测试")
    print("=" * 60)
    
    success = test_upload()
    
    print("\n" + "=" * 60)
    if success:
        print("✓ 测试通过: 图片上传功能正常")
        exit(0)
    else:
        print("✗ 测试失败: 图片上传功能异常")
        exit(1)
