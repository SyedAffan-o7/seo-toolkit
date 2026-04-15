from pydantic import BaseModel, Field
from typing import List, Optional

class SEOMetaData(BaseModel):
    url: str = Field(description="The URL that was analyzed")
    title: str = Field(description="Page title from <title> tag")
    title_length: int = Field(description="Character count of title")
    meta_description: Optional[str] = Field(
        default=None, 
        description="Meta description content"
    )
    meta_description_length: int = Field(
        default=0,
        description="Character count of meta description"
    )
    canonical_url: Optional[str] = Field(
        default=None,
        description="Canonical URL from rel=canonical"
    )
    h1_tags: List[str] = Field(
        default_factory=list,
        description="All H1 heading texts"
    )
    h2_tags: List[str] = Field(
        default_factory=list,
        description="All H2 heading texts"
    )
    image_count: int = Field(
        default=0,
        description="Number of images on page"
    )
    images_without_alt: int = Field(
        default=0,
        description="Images missing alt attributes"
    )
    internal_links: int = Field(
        default=0,
        description="Count of internal links"
    )
    external_links: int = Field(
        default=0,
        description="Count of external links"
    )
    has_schema_markup: bool = Field(
        default=False,
        description="Presence of JSON-LD schema"
    )


class SEOIssue(BaseModel):

    severity:str = Field(description="Severity: 'critical', 'warning', or 'info'")
    category:str = Field(description="Category: 'title', 'meta', 'headings', 'images', 'links'")
    description:str = Field(description="Description of the issue")
    message: str = Field(description="Human-readable issue description")
    recommendation: str = Field(description="How to fix the issue")
      