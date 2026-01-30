#!/usr/bin/env python3
"""
房源商城服务管理脚本
用于启动、停止和检查服务状态
"""

import os
import sys
import time
import subprocess
import signal
import requests

def run_command(cmd, shell=True):
    """执行命令并返回结果"""
    try:
        result = subprocess.run(
            cmd, 
            shell=shell, 
            capture_output=True, 
            text=True,
            timeout=10
        )
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def find_process_by_port(port):
    """查找占用指定端口的进程"""
    code, stdout, _ = run_command(f"lsof -ti:{port}")
    if code == 0 and stdout.strip():
        return [int(pid) for pid in stdout.strip().split('\n')]
    return []

def kill_processes(pids):
    """杀死指定的进程"""
    for pid in pids:
        try:
            os.kill(pid, signal.SIGKILL)
            print(f"✓ 已停止进程 PID: {pid}")
        except:
            pass

def stop_service():
    """停止服务"""
    print("=== 停止服务 ===")
    
    # 1. 通过端口查找
    pids = find_process_by_port(3100)
    if pids:
        print(f"发现占用3100端口的进程: {pids}")
        kill_processes(pids)
    
    # 2. 通过进程名查找
    code, stdout, _ = run_command("pgrep -f 'node.*JTFP.*dist/index.js'")
    if code == 0 and stdout.strip():
        pids = [int(pid) for pid in stdout.strip().split('\n')]
        print(f"发现JTFP服务进程: {pids}")
        kill_processes(pids)
    
    time.sleep(2)
    print("✓ 服务已停止\n")

def start_service():
    """启动服务"""
    print("=== 启动服务 ===")
    
    os.chdir('/www/wwwroot/JTFP')
    
    # 确保日志目录存在
    os.makedirs('logs', exist_ok=True)
    
    # 启动服务
    log_file = open('logs/server.log', 'w')
    process = subprocess.Popen(
        ['node', 'dist/index.js'],
        stdout=log_file,
        stderr=subprocess.STDOUT,
        preexec_fn=os.setsid
    )
    
    print(f"✓ 服务已启动，PID: {process.pid}")
    print("等待服务初始化...")
    time.sleep(5)
    
    return process.pid

def check_service():
    """检查服务状态"""
    print("=== 检查服务状态 ===")
    
    # 1. 检查健康接口
    try:
        response = requests.get('http://localhost:3100/health', timeout=5)
        if response.status_code == 200:
            print(f"✓ 健康检查通过: {response.json()}")
        else:
            print(f"✗ 健康检查失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 无法连接服务: {e}")
        return False
    
    # 2. 检查房源API
    try:
        response = requests.get('http://localhost:3100/api/v1/properties/mall?pageSize=1', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 房源API正常: 共 {data.get('total', 0)} 条房源")
        else:
            print(f"⚠ 房源API异常: HTTP {response.status_code}")
    except Exception as e:
        print(f"⚠ 房源API测试失败: {e}")
    
    print()
    return True

def insert_test_data():
    """插入测试数据"""
    print("=== 插入测试数据 ===")
    
    sql_file = '/www/wwwroot/JTFP/insert_test_data.sql'
    if not os.path.exists(sql_file):
        print("✗ SQL文件不存在")
        return False
    
    code, stdout, stderr = run_command(f"mysql -u root h5mall < {sql_file}")
    if code == 0:
        print("✓ 测试数据插入成功")
        print(stdout)
        return True
    else:
        print(f"✗ 测试数据插入失败: {stderr}")
        return False

def show_urls():
    """显示访问地址"""
    print("=== 访问地址 ===")
    print("后台管理: https://www.jintai.cloud/JTFP/H5/admin/")
    print("H5商城列表: https://www.jintai.cloud/h5/#/properties")
    print("H5商城详情: https://www.jintai.cloud/h5/#/property/1")
    print("API列表: https://www.jintai.cloud/h5/api/api/v1/properties/mall")
    print()

def main():
    """主函数"""
    if len(sys.argv) > 1:
        action = sys.argv[1]
    else:
        action = 'restart'
    
    if action == 'stop':
        stop_service()
    elif action == 'start':
        start_service()
        check_service()
        show_urls()
    elif action == 'restart':
        stop_service()
        insert_test_data()
        start_service()
        check_service()
        show_urls()
    elif action == 'status':
        check_service()
        show_urls()
    else:
        print("用法: python3 manage_service.py [start|stop|restart|status]")
        sys.exit(1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n操作已取消")
        sys.exit(0)
    except Exception as e:
        print(f"\n错误: {e}")
        sys.exit(1)
