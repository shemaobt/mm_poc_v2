import json
import asyncio
from typing import Dict, Any, Optional
from functools import lru_cache

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import get_settings


class LLMConfig:
    """
    Configuration constants for LLM models and parameters.
    """
    MODEL_OPUS = "claude-opus-4-5-20251101"
    MODEL_SONNET = "claude-sonnet-4-20250514"
    
    DEFAULT_MAX_TOKENS = 64000
    TRANSLATION_MAX_TOKENS = 4000
    REHEARSAL_MAX_TOKENS = 16000
    CLAUSE_MERGE_MAX_TOKENS = 2000
    
    DEFAULT_TEMPERATURE = 0
    TRANSLATION_TEMPERATURE = 0.3
    CLAUSE_MERGE_TEMPERATURE = 0.2
    
    RETRY_COUNT = 5
    RETRY_BASE_DELAY = 3


@lru_cache
def get_llm(
    model: str = LLMConfig.MODEL_OPUS,
    max_tokens: int = LLMConfig.DEFAULT_MAX_TOKENS,
    temperature: float = LLMConfig.DEFAULT_TEMPERATURE,
) -> ChatAnthropic:
    """
    Get a configured LangChain ChatAnthropic instance.
    
    Args:
        model: The Claude model to use.
        max_tokens: Maximum tokens in response.
        temperature: Sampling temperature.
        
    Returns:
        A configured ChatAnthropic instance.
    """
    settings = get_settings()
    return ChatAnthropic(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        api_key=settings.anthropic_api_key,
    )


def get_llm_uncached(
    model: str = LLMConfig.MODEL_OPUS,
    max_tokens: int = LLMConfig.DEFAULT_MAX_TOKENS,
    temperature: float = LLMConfig.DEFAULT_TEMPERATURE,
) -> ChatAnthropic:
    """
    Get a fresh (non-cached) LangChain ChatAnthropic instance.
    Use when you need different parameters per call.
    
    Args:
        model: The Claude model to use.
        max_tokens: Maximum tokens in response.
        temperature: Sampling temperature.
        
    Returns:
        A configured ChatAnthropic instance.
    """
    settings = get_settings()
    return ChatAnthropic(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        api_key=settings.anthropic_api_key,
    )


async def invoke_with_retry(
    llm: ChatAnthropic,
    system_prompt: str,
    user_prompt: str,
    retries: int = LLMConfig.RETRY_COUNT,
    base_delay: int = LLMConfig.RETRY_BASE_DELAY,
) -> str:
    """
    Invoke the LLM with automatic retry on overload (529) errors.
    
    Args:
        llm: The ChatAnthropic instance.
        system_prompt: The system message.
        user_prompt: The user message.
        retries: Number of retry attempts.
        base_delay: Base delay for exponential backoff.
        
    Returns:
        The response content as a string.
        
    Raises:
        Exception: If all retries fail.
    """
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]
    
    for attempt in range(retries):
        try:
            response = await llm.ainvoke(messages)
            return response.content
        except Exception as e:
            is_overloaded = "529" in str(e) or "overloaded" in str(e).lower()
            if is_overloaded and attempt < retries - 1:
                sleep_time = base_delay * (2 ** attempt)
                print(f"[AI] API Overloaded (529). Retrying in {sleep_time}s... (Attempt {attempt + 1}/{retries})")
                await asyncio.sleep(sleep_time)
                continue
            raise


def parse_json_response(content: str) -> Dict[str, Any]:
    """
    Parse JSON from LLM response, handling markdown code blocks and truncation.
    
    Args:
        content: The raw LLM response content.
        
    Returns:
        Parsed JSON as a dictionary.
        
    Raises:
        json.JSONDecodeError: If JSON cannot be parsed after repair attempts.
    """
    import re
    
    content = content.strip()
    
    if "```" in content:
        pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
        match = re.search(pattern, content)
        if match:
            content = match.group(1).strip()
    
    if not (content.startswith("{") and content.endswith("}")):
        start = content.find("{")
        if start != -1:
            content = content[start:]
    
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        try:
            print(f"[AI] JSON parse failed. Attempting to repair truncation. Content length: {len(content)}")
            fixed_content = _repair_truncated_json(content)
            return json.loads(fixed_content)
        except Exception as e2:
            try:
                fixed_content = re.sub(r",\s*([\]}])", r"\1", content)
                return json.loads(fixed_content)
            except Exception:
                print(f"[AI] JSON REPAIR FAILED. Content length: {len(content)}")
                print(f"TAIL of content: {content[-200:]}")
                raise e2


def _repair_truncated_json(json_str: str) -> str:
    """
    Heuristic to close open braces/brackets for truncated JSON.
    
    Args:
        json_str: Potentially truncated JSON string.
        
    Returns:
        Repaired JSON string with closed brackets.
    """
    stack = []
    in_string = False
    escape = False
    
    for i, char in enumerate(json_str):
        if in_string:
            if escape:
                escape = False
            elif char == '\\':
                escape = True
            elif char == '"':
                in_string = False
        else:
            if char == '"':
                in_string = True
            elif char == '{':
                stack.append('}')
            elif char == '[':
                stack.append(']')
            elif char == '}' or char == ']':
                if stack:
                    expected = stack.pop()
                    if char != expected:
                        json_str = json_str[:i]
                        break
    
    if in_string:
        json_str += '"'
        
    json_str = json_str.rstrip()
    if json_str.endswith(','):
        json_str = json_str[:-1]
        
    while stack:
        json_str += stack.pop()
        
    return json_str


async def call_llm_for_json(
    system_prompt: str,
    user_prompt: str,
    model: str = LLMConfig.MODEL_OPUS,
    max_tokens: int = LLMConfig.DEFAULT_MAX_TOKENS,
    temperature: float = LLMConfig.DEFAULT_TEMPERATURE,
) -> Dict[str, Any]:
    """
    High-level function to call LLM and parse JSON response.
    
    Args:
        system_prompt: The system message.
        user_prompt: The user message.
        model: The Claude model to use.
        max_tokens: Maximum tokens in response.
        temperature: Sampling temperature.
        
    Returns:
        Parsed JSON response as a dictionary.
    """
    llm = get_llm_uncached(model=model, max_tokens=max_tokens, temperature=temperature)
    content = await invoke_with_retry(llm, system_prompt, user_prompt)
    return parse_json_response(content)


async def call_llm_for_text(
    system_prompt: str,
    user_prompt: str,
    model: str = LLMConfig.MODEL_SONNET,
    max_tokens: int = LLMConfig.REHEARSAL_MAX_TOKENS,
    temperature: float = LLMConfig.DEFAULT_TEMPERATURE,
) -> str:
    """
    High-level function to call LLM and return raw text response.
    
    Args:
        system_prompt: The system message (empty string for user-only prompts).
        user_prompt: The user message.
        model: The Claude model to use.
        max_tokens: Maximum tokens in response.
        temperature: Sampling temperature.
        
    Returns:
        Raw text response.
    """
    llm = get_llm_uncached(model=model, max_tokens=max_tokens, temperature=temperature)
    
    if system_prompt:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
    else:
        messages = [HumanMessage(content=user_prompt)]
    
    response = await llm.ainvoke(messages)
    return response.content.strip()
