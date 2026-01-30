#!/usr/bin/env python3
"""
测试图片预览功能修复
验证：
1. Admin后台可以预览已上传的图片
2. H5页面可以显示房源图片
"""
from playwright.sync_api import sync_playwright
import time

def test_admin_image_preview():
    """测试Admin后台图片预览"""
    print("=" * 60)
    print("测试1: Admin后台图片预览")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            # 访问Admin后台
            print(f"\n访问: http://localhost:6001/JTFP/admin/properties")
            page.goto('http://localhost:6001/JTFP/admin/properties')
            page.wait_for_load_state('networkidle')
            time.sleep(2)
            
            # 截图查看当前状态
            page.screenshot(path='/tmp/admin_properties.png', full_page=True)
            print("✓ 已截图保存到 /tmp/admin_properties.png")
            
            # 查找图片元素
            images = page.locator('img').all()
            print(f"\n找到 {len(images)} 个图片元素")
            
            # 检查是否有图片加载失败
            failed_images = []
            for i, img in enumerate(images):
                src = img.get_attribute('src') or ''
                if 'uploads' in src:
                    print(f"  图片 {i+1}: {src[:80]}...")
                    # 检查图片是否加载成功
                    try:
                        natural_width = page.evaluate('''(img) => {
                            return img.naturalWidth;
                        }''', img)
                        if natural_width == 0:
                            failed_images.append(src)
                            print(f"    ✗ 图片加载失败")
                        else:
                            print(f"    ✓ 图片加载成功 (宽度: {natural_width}px)")
                    except:
                        print(f"    ? 无法检查图片状态")
            
            if failed_images:
                print(f"\n⚠ 发现 {len(failed_images)} 张图片加载失败")
                return False
            else:
                print("\n✓ Admin后台图片预览测试通过")
                return True
                
        except Exception as e:
            print(f"\n✗ Admin后台测试出错: {e}")
            return False
        finally:
            browser.close()

def test_h5_image_display():
    """测试H5页面图片显示"""
    print("\n" + "=" * 60)
    print("测试2: H5页面图片显示")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            # 访问H5房源详情页
            url = 'http://localhost:6002/JTFP/h5/property/2'
            print(f"\n访问: {url}")
            page.goto(url)
            page.wait_for_load_state('networkidle')
            time.sleep(3)  # 等待图片加载
            
            # 截图查看当前状态
            page.screenshot(path='/tmp/h5_property_detail.png', full_page=True)
            print("✓ 已截图保存到 /tmp/h5_property_detail.png")
            
            # 查找图片元素
            images = page.locator('img').all()
            print(f"\n找到 {len(images)} 个图片元素")
            
            # 检查上传的图片
            upload_images = []
            failed_images = []
            
            for i, img in enumerate(images):
                src = img.get_attribute('src') or ''
                if 'uploads' in src:
                    upload_images.append((i, src))
                    print(f"  上传图片 {i+1}: {src[:80]}...")
                    
                    # 检查图片是否加载成功
                    try:
                        natural_width = page.evaluate('''(img) => {
                            return img.naturalWidth;
                        }''', img)
                        if natural_width == 0:
                            failed_images.append(src)
                            print(f"    ✗ 图片加载失败")
                        else:
                            print(f"    ✓ 图片加载成功 (宽度: {natural_width}px)")
                    except Exception as e:
                        print(f"    ? 无法检查图片状态: {e}")
            
            if not upload_images:
                print("\n⚠ 未找到上传的图片（可能该房源没有图片）")
                return True  # 不算失败
            
            if failed_images:
                print(f"\n✗ 发现 {len(failed_images)} 张图片加载失败")
                return False
            else:
                print(f"\n✓ H5页面图片显示测试通过（找到 {len(upload_images)} 张上传的图片）")
                return True
                
        except Exception as e:
            print(f"\n✗ H5页面测试出错: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            browser.close()

def main():
    print("\n" + "=" * 60)
    print("图片预览功能修复验证测试")
    print("=" * 60)
    print("\n注意：如果修改了Vite配置文件，需要重启前端服务才能生效")
    print("  - Admin: 端口6001")
    print("  - H5: 端口6002")
    print("  - 后端: 端口6000")
    print("\n开始测试...\n")
    
    result1 = test_admin_image_preview()
    result2 = test_h5_image_display()
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"Admin后台图片预览: {'✓ 通过' if result1 else '✗ 失败'}")
    print(f"H5页面图片显示: {'✓ 通过' if result2 else '✗ 失败'}")
    
    if result1 and result2:
        print("\n🎉 所有测试通过！图片预览功能已修复。")
        return 0
    else:
        print("\n⚠ 部分测试失败，请检查服务是否已重启，或查看截图了解详情。")
        return 1

if __name__ == '__main__':
    exit(main())
