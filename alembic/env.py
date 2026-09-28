import sys
import os

# Añadir la raíz al sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Solo importa la Base (o los modelos directamente si database NO los importa)
from database import Base

target_metadata = Base.metadata