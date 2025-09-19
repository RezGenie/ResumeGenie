import PyPDF2
import docx
import json
import spacy
from typing import Dict, Any
import os


class ResumeParser:
    def __init__(self):
        # Try to load spaCy model, download if not available
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("spaCy model 'en_core_web_sm' not found. Using basic parsing.")
            self.nlp = None
    
    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parse resume file and extract content and structured data"""
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            content = self._parse_pdf(file_path)
        elif file_ext in ['.docx', '.doc']:
            content = self._parse_docx(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        # Extract structured data
        structured_data = self._extract_structured_data(content)
        
        return {
            'content': content,
            'data': structured_data
        }
    
    def _parse_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
        except Exception as e:
            print(f"Error parsing PDF: {e}")
            return ""
    
    def _parse_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            print(f"Error parsing DOCX: {e}")
            return ""
    
    def _extract_structured_data(self, content: str) -> Dict[str, Any]:
        """Extract structured data from resume content using NLP"""
        if not self.nlp:
            return self._basic_extraction(content)
        
        doc = self.nlp(content)
        
        # Extract entities
        entities = {
            'persons': [],
            'organizations': [],
            'locations': [],
            'emails': [],
            'phone_numbers': []
        }
        
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                entities['persons'].append(ent.text)
            elif ent.label_ == "ORG":
                entities['organizations'].append(ent.text)
            elif ent.label_ in ["GPE", "LOC"]:
                entities['locations'].append(ent.text)
        
        # Extract emails and phone numbers using regex
        import re
        
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        phone_pattern = r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        
        entities['emails'] = re.findall(email_pattern, content)
        entities['phone_numbers'] = re.findall(phone_pattern, content)
        
        # Extract skills (basic keyword matching)
        skills_keywords = [
            'python', 'javascript', 'react', 'node.js', 'sql', 'aws', 'docker',
            'kubernetes', 'git', 'machine learning', 'deep learning', 'tensorflow',
            'pytorch', 'pandas', 'numpy', 'flask', 'django', 'fastapi', 'redis',
            'postgresql', 'mongodb', 'elasticsearch', 'kafka', 'spark', 'hadoop'
        ]
        
        content_lower = content.lower()
        detected_skills = [skill for skill in skills_keywords if skill in content_lower]
        
        return {
            'entities': entities,
            'skills': detected_skills,
            'sections': self._identify_sections(content)
        }
    
    def _basic_extraction(self, content: str) -> Dict[str, Any]:
        """Basic extraction without spaCy"""
        import re
        
        # Extract emails and phone numbers
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        phone_pattern = r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        
        emails = re.findall(email_pattern, content)
        phone_numbers = re.findall(phone_pattern, content)
        
        return {
            'emails': emails,
            'phone_numbers': phone_numbers,
            'sections': self._identify_sections(content)
        }
    
    def _identify_sections(self, content: str) -> Dict[str, str]:
        """Identify different sections in the resume"""
        sections = {}
        lines = content.split('\n')
        current_section = 'summary'
        current_content = []
        
        section_keywords = {
            'experience': ['experience', 'work history', 'employment', 'professional'],
            'education': ['education', 'academic', 'university', 'college', 'degree'],
            'skills': ['skills', 'technical skills', 'competencies', 'technologies'],
            'projects': ['projects', 'portfolio', 'achievements'],
            'certifications': ['certifications', 'certificates', 'credentials']
        }
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check if line is a section header
            section_found = False
            for section, keywords in section_keywords.items():
                if any(keyword in line_lower for keyword in keywords):
                    # Save previous section
                    if current_content:
                        sections[current_section] = '\n'.join(current_content)
                    
                    current_section = section
                    current_content = []
                    section_found = True
                    break
            
            if not section_found and line.strip():
                current_content.append(line)
        
        # Save final section
        if current_content:
            sections[current_section] = '\n'.join(current_content)
        
        return sections