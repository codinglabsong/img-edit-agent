import os
from operator import add
from typing import Annotated, List, Literal

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field
from typing_extensions import TypedDict

load_dotenv()

llm = init_chat_model("gemini-2.5-flash", model_provider="google_genai")


# Schema
class InputState(TypedDict):
    question: str


class OverallState(TypedDict):
    question: str
    next_action: str
    steps: Annotated[List[str], add]


class OutputState(TypedDict):
    answer: str
    steps: List[str]


# First step
guardrails_system = """
As an intelligent assistant, your primary objective is to decide
whether a given question is related to movies or not.
If the question is related to movies, output "movie".
Otherwise, output "end".
To make this decision, assess the content of the question and
determine if it refers to any movie, actor, director, film industry,
or related topics. Provide only the specified output: "movie" or "end".
"""
guardrails_prompt = ChatPromptTemplate.from_messages(
    [("system", guardrails_system), ("user", "{question}")]
)


class GuardrailsOutput(BaseModel):
    decision: Literal["movie", "end"] = Field(
        description="Decision on whether the question is related to movies"
    )


gaurdrails_chain = guardrails_prompt | llm.with_structured_output(GuardrailsOutput)


def guardrails(state: InputState) -> OverallState:
    """
    Descides if the question is related to movies or not.
    """
    guardrails_output = gaurdrails_chain.invoke({"question": state["question"]})
    return {
        "question": state["question"],
        "next_action": guardrails_output.decision,
        "steps": ["guardrail"],
    }


# Dummy Steps
def print_movie(state: OverallState) -> OutputState:
    print("The question is related to movies.")
    return {"answer": "The question is related to movies.", "steps": ["print_movie"]}


def print_end(state: OverallState) -> OutputState:
    print("The question is not related to movies.")
    return {"answer": "The question is not related to movies.", "steps": ["print_end"]}


# Conditional Edge Functions
def guardrail_condition(state: OverallState) -> Literal["print_movie", "print_end"]:
    if state.get("next_action") == "movie":
        return "print_movie"
    return "print_end"


# Node Graph
langgraph = StateGraph(OverallState, input_schema=InputState, output_schema=OutputState)
langgraph.add_node(guardrails)
langgraph.add_node(print_movie)
langgraph.add_node(print_end)

langgraph.add_edge(START, "guardrails")
langgraph.add_conditional_edges("guardrails", guardrail_condition)
langgraph.add_edge("print_movie", END)
langgraph.add_edge("print_end", END)

langgraph = langgraph.compile()

# View LangGraph structure
png_bytes = langgraph.get_graph().draw_mermaid_png()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(SCRIPT_DIR, "..", "structure.png"), "wb") as f:
    f.write(png_bytes)

langgraph.invoke({"question": "I HATE Zebras!"})
