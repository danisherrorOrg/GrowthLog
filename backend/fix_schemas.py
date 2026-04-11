import re

with open("models/schemas.py", "r") as f:
    text = f.read()

text = text.replace("from pydantic import BaseModel, field_validator, EmailStr", "from pydantic import BaseModel, field_validator, EmailStr, Field", 1)

lines = text.split('\n')
for i, line in enumerate(lines):
    if line.startswith("    ") and not line.startswith("        ") and ":" in line:
        if "#" in line:
            code, comment = line.split("#", 1)
            comment = " #" + comment
        else:
            code = line
            comment = ""
            
        code = code.rstrip()
        clean_code = code.strip()

        if clean_code.startswith("@") or clean_code.startswith("def ") or clean_code.startswith("class ") or "Field(" in clean_code:
            continue
            
        if re.match(r'^\w+:\s*str$', clean_code):
           num_spaces = len(line) - len(line.lstrip())
           lines[i] = " " * num_spaces + clean_code + " = Field(..., max_length=10000)" + comment
           continue

        m = re.match(r'^(\w+):\s*Optional\[str\]\s*=\s*(.*)$', clean_code)
        if m:
            default_val = m.group(2)
            num_spaces = len(line) - len(line.lstrip())
            lines[i] = " " * num_spaces + f"{m.group(1)}: Optional[str] = Field({default_val}, max_length=20000)" + comment

with open("models/schemas.py", "w") as f:
    f.write("\n".join(lines))
    print("Successfully patched schemas.py")
