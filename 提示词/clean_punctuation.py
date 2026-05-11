# -*- coding: utf-8 -*-
import os

# 读取当前项目目录下的正文文件夹，包括其内部嵌套的卷文件夹
project_root = os.getcwd()
text_folder = os.path.join(project_root, '正文')

if not os.path.exists(text_folder):
    print(f"未找到目标正文目录: {text_folder}")
    exit()

def process_file(file_path, filename):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 处理标点符号替换
    result = []
    in_double_quote = False
    in_single_quote = False
    
    for char in content:
        # 替换英文双引号
        if char == '"':
            if not in_double_quote:
                result.append('\u201c')
                in_double_quote = True
            else:
                result.append('\u201d')
                in_double_quote = False
        # 替换英文单引号
        elif char == "'":
            if not in_single_quote:
                result.append('\u2018')
                in_single_quote = True
            else:
                result.append('\u2019')
                in_single_quote = False
        # 替换直角引号为弯引号
        elif char == '「':
            result.append('\u201c')
        elif char == '」':
            result.append('\u201d')
        elif char == '『':
            result.append('\u2018')
        elif char == '』':
            result.append('\u2019')
        elif char == ",":
            result.append('\uff0c')
        elif char == "!":
            result.append('\uff01')
        elif char == "?":
            result.append('\uff1f')
        elif char == ":":
            result.append('\uff1a')
        else:
            # 其他字符保持不变
            result.append(char)

    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(''.join(result))
    print(f"已处理标点净网: {filename}")

# 递归遍历所有目录下的md内容
processed_count = 0
for root, dirs, files in os.walk(text_folder):
    for filename in files:
        if filename.endswith('.md'):
            file_path = os.path.join(root, filename)
            process_file(file_path, filename)
            processed_count += 1

print(f"清扫完成！共处理了 {processed_count} 个章节文件。")
