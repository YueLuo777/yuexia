import os

def update_template():
    wf_path = r"E:\激情创作小说文稿项目\.skills\novel-project-init\templates\workflows\一键AI续写章节_v4.0.md"
    try:
        with open(wf_path, 'r', encoding='utf-8') as f:
            wf_content = f.read()

        rule_addition = "> - ❌ **严禁使用任何破折号及“---”**：写正文、剧本或过渡时，绝对不允许生成破折号（——长横线）、英文字母连字符（-）或横向分割线（---）。凡是需要停顿、拖长音的地方，一律使用省略号（……）或其他正常标点代替！绝不允许出现 --- 孤立的一行！\n> - ✅ [请填写应该遵循的规范]"
        if "严禁使用任何破折号及“---”" not in wf_content:
            wf_content = wf_content.replace("> - ✅ [请填写应该遵循的规范]", rule_addition)

        lines = wf_content.split('\n')
        for i in range(len(lines)):
            if lines[i].strip() == '---' and i > 3:
                lines[i] = '***'

        with open(wf_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print(f"Successfully updated {wf_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    update_template()
