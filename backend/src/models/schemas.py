# models/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

# Schemas de respuesta para llamadas
class CallRecord(BaseModel):
    calldate: datetime
    clid: str
    src: str
    dst: str
    dcontext: str
    channel: str
    dstchannel: str
    lastapp: str
    lastdata: str
    duration: int
    billsec: int
    disposition: str
    amaflags: str
    accountcode: str
    uniqueid: str
    userfield: str

class CallStats(BaseModel):
    total_calls: int
    answered_calls: int
    abandoned_calls: int
    total_duration: int
    avg_duration: float
    avg_wait_time: float
    answer_rate: float

class QueueCallRecord(BaseModel):
    time: datetime
    callid: str
    queuename: str
    agent: str
    event: str
    data1: str
    data2: str
    data3: str
    data4: str
    data5: str

class QueueStats(BaseModel):
    queue_name: str
    total_calls: int
    answered_calls: int
    abandoned_calls: int
    avg_wait_time: float
    max_wait_time: float
    service_level: float  # % de llamadas respondidas en < 30 seg
    abandon_rate: float

class AgentStats(BaseModel):
    agent: str
    agent_name: Optional[str] = None
    total_calls: int
    answered_calls: int
    total_talk_time: int
    avg_talk_time: float
    max_talk_time: int
    min_talk_time: int

class RealtimeQueueStatus(BaseModel):
    queue_name: str
    calls_waiting: int
    available_agents: int
    busy_agents: int
    agents_total: int
    longest_wait: int
    calls_completed: int
    calls_abandoned: int
    service_level_current: float

class RealtimeAgentStatus(BaseModel):
    agent: str
    agent_name: Optional[str] = None
    status: str  # AVAILABLE, IN_CALL, PAUSED, UNAVAILABLE
    queue: Optional[str] = None
    call_duration: Optional[int] = None
    pause_reason: Optional[str] = None
    last_call_time: Optional[datetime] = None

class DashboardSummary(BaseModel):
    date: date
    total_calls: int
    answered_calls: int
    abandoned_calls: int
    avg_answer_speed: float
    service_level: float
    active_agents: int
    peak_hour: int
    peak_calls: int

# Schemas de filtros
class DateRangeFilter(BaseModel):
    start_date: date
    end_date: date
    queue: Optional[str] = None
    agent: Optional[str] = None

class RealtimeFilter(BaseModel):
    queue: Optional[str] = None
    refresh_interval: int = Field(default=5, ge=1, le=60)  # segundos

# Response models
class ApiResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    message: Optional[str] = None
    error: Optional[str] = None
